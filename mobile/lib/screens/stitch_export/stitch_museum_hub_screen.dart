import 'package:flutter/material.dart';

import '../../l10n/app_strings.dart';
import '../../models/chat_args.dart';
import '../../models/room.dart';
import '../../services/api_service.dart';
import '../../services/ticket_gate.dart';
import '../../services/tour_session.dart';
import '../../widgets/museum_network_image.dart';
import '../../widgets/settings_icon_button.dart';
import 'stitch_chat_screen.dart';
import 'stitch_routes.dart';
import 'stitch_theme.dart';

/// Explore tab — tour rooms from the active QR-started chain only.
///
/// Walks [Room.nextRoomId] from [TourSession.tourStartRoomId]. Never assumes
/// a single museum's hardcoded sequence.
class StitchMuseumHubScreen extends StatefulWidget {
  const StitchMuseumHubScreen({
    super.key,
    this.showBottomNav = true,
    this.onSwitchToScan,
  });

  final bool showBottomNav;
  final VoidCallback? onSwitchToScan;

  @override
  State<StitchMuseumHubScreen> createState() => _StitchMuseumHubScreenState();
}

class _StitchMuseumHubScreenState extends State<StitchMuseumHubScreen> {
  final ApiService _api = ApiService();

  List<Room>? _rooms;
  Object? _error;
  bool _loading = true;
  bool _needsScan = false;

  @override
  void initState() {
    super.initState();
    _loadTour();
  }

  @override
  void dispose() {
    _api.dispose();
    super.dispose();
  }

  Future<void> _loadTour() async {
    setState(() {
      _loading = true;
      _error = null;
      _needsScan = false;
    });

    final String? startId = TourSession.tourStartRoomId;
    if (startId == null || startId.isEmpty) {
      if (!mounted) {
        return;
      }
      setState(() {
        _rooms = <Room>[];
        _needsScan = true;
        _loading = false;
      });
      return;
    }

    try {
      final List<Room> rooms = await _api.getTourRooms(startId: startId);
      if (!mounted) {
        return;
      }
      setState(() {
        _rooms = rooms;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = e;
        _loading = false;
      });
    }
  }

  Future<void> _openRoom(Room room) async {
    final bool granted = await TicketGate.ensureAccess(context, room: room);
    if (!mounted || !granted) {
      return;
    }
    await Navigator.pushNamed(context, StitchRoutes.room, arguments: room);
    if (mounted) {
      await _loadTour();
    }
  }

  @override
  Widget build(BuildContext context) {
    final AppStrings s = AppStrings.of(context);

    return Scaffold(
      backgroundColor: StitchTheme.darkText,
      floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,
      floatingActionButton:
          _rooms == null || _rooms!.isEmpty
              ? null
              : FloatingActionButton(
                heroTag: 'tour-ai-guide',
                tooltip: s.chatWithAiGuideTooltip,
                onPressed: () {
                  final Room room = _rooms!.first;
                  showStitchChatSheet(
                    context,
                    args: ChatArgs(
                      waypointId: room.id,
                      contextTitle: room.title,
                    ),
                  );
                },
                backgroundColor: StitchTheme.adwaGold,
                foregroundColor: StitchTheme.ink,
                elevation: 8,
                shape: const CircleBorder(
                  side: BorderSide(color: StitchTheme.panel, width: 2),
                ),
                child: const Icon(Icons.chat_bubble_outline),
              ),
      body: SafeArea(child: _buildBody(s)),
      bottomNavigationBar:
          widget.showBottomNav ? const StitchBottomNav(activeIndex: 0) : null,
    );
  }

  Widget _buildBody(AppStrings s) {
    if (_loading) {
      return const Center(
        child: CircularProgressIndicator(color: StitchTheme.adwaGold),
      );
    }

    if (_needsScan) {
      return _ExploreEmptyState(strings: s, onScan: widget.onSwitchToScan);
    }

    if (_error != null || _rooms == null || _rooms!.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: <Widget>[
              Text(
                s.couldNotLoadTour,
                style: StitchTheme.headline(
                  size: 24,
                  color: StitchTheme.parchment,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                _error is ApiException
                    ? (_error! as ApiException).message
                    : s.pleaseTryAgain,
                textAlign: TextAlign.center,
                style: StitchTheme.body(size: 16, color: StitchTheme.muted),
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: _loadTour,
                style: FilledButton.styleFrom(
                  backgroundColor: StitchTheme.adwaGold,
                  foregroundColor: StitchTheme.ink,
                ),
                child: Text(s.retry),
              ),
            ],
          ),
        ),
      );
    }

    final List<Room> rooms = _rooms!;
    final Room hero = rooms.first;
    final String? heroImage =
        hero.items.isNotEmpty ? hero.items.first.imageUrl : null;

    return CustomScrollView(
      slivers: <Widget>[
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 4, 8, 10),
            child: Row(
              children: <Widget>[
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(left: 12),
                    child: Text(
                      s.yourTour,
                      style: StitchTheme.overline(
                        size: 12,
                        color: StitchTheme.muted,
                      ),
                    ),
                  ),
                ),
                TextButton.icon(
                  onPressed: widget.onSwitchToScan,
                  icon: const Icon(
                    Icons.qr_code_scanner,
                    color: StitchTheme.muted,
                    size: 20,
                  ),
                  label: Text(
                    s.scan,
                    style: StitchTheme.body(size: 14, color: StitchTheme.muted),
                  ),
                ),
                const SettingsIconButton(color: StitchTheme.muted),
              ],
            ),
          ),
        ),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(28),
              child: Stack(
                children: <Widget>[
                  SizedBox(
                    height: 460,
                    width: double.infinity,
                    child:
                        heroImage == null
                            ? const ColoredBox(color: StitchTheme.panel)
                            : MuseumNetworkImage(
                              url: heroImage,
                              fit: BoxFit.cover,
                              fallback: const ColoredBox(
                                color: StitchTheme.panel,
                              ),
                            ),
                  ),
                  Positioned.fill(
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: <Color>[
                            Colors.transparent,
                            StitchTheme.heroScrim.withValues(alpha: 0.55),
                            StitchTheme.heroScrim.withValues(alpha: 0.9),
                          ],
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    left: 20,
                    right: 20,
                    bottom: 24,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: StitchTheme.panel,
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            s.roomNumberOf(hero.storyOrder, rooms.length),
                            style: StitchTheme.overline(
                              size: 11,
                              color: StitchTheme.muted,
                            ),
                          ),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          hero.title,
                          style: StitchTheme.headline(
                            size: 36,
                            color: StitchTheme.heroText,
                            height: 1.05,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          hero.roomOverviewText,
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                          style: StitchTheme.body(
                            size: 16,
                            color: StitchTheme.heroText.withValues(alpha: 0.86),
                            height: 1.45,
                          ),
                        ),
                        const SizedBox(height: 14),
                        FilledButton.icon(
                          onPressed: () => _openRoom(hero),
                          style: FilledButton.styleFrom(
                            backgroundColor: StitchTheme.adwaGold,
                            foregroundColor: StitchTheme.ink,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(999),
                            ),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 22,
                              vertical: 14,
                            ),
                          ),
                          label: Text(s.enterRoom),
                          icon: const Icon(Icons.arrow_forward),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 28, 24, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  s.tourRooms,
                  style: StitchTheme.headline(
                    size: 28,
                    weight: FontWeight.w500,
                    color: StitchTheme.parchment,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  s.tourRoomsHint,
                  style: StitchTheme.body(size: 15, color: StitchTheme.muted),
                ),
              ],
            ),
          ),
        ),
        SliverToBoxAdapter(
          child: SizedBox(
            height: 300,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: rooms.length,
              itemBuilder: (BuildContext context, int index) {
                final Room room = rooms[index];
                return _RoomCard(room: room, onTap: () => _openRoom(room));
              },
            ),
          ),
        ),
        const SliverToBoxAdapter(child: SizedBox(height: 110)),
      ],
    );
  }
}

class _RoomCard extends StatelessWidget {
  const _RoomCard({required this.room, required this.onTap});

  final Room room;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final AppStrings s = AppStrings.of(context);
    final String? image =
        room.items.isNotEmpty ? room.items.first.imageUrl : null;

    return Padding(
      padding: const EdgeInsets.only(right: 16),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(14),
          child: SizedBox(
            width: 240,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(14),
                    child:
                        image == null
                            ? const ColoredBox(color: StitchTheme.panel)
                            : MuseumNetworkImage(
                              url: image,
                              fit: BoxFit.cover,
                              width: double.infinity,
                              fallback: const ColoredBox(
                                color: StitchTheme.panel,
                              ),
                            ),
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  s.roomNumber(room.storyOrder),
                  style: StitchTheme.overline(
                    size: 10,
                    color: StitchTheme.muted,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  room.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: StitchTheme.headline(
                    size: 20,
                    color: StitchTheme.parchment,
                    weight: FontWeight.w500,
                  ),
                ),
                Text(
                  s.itemCount(room.items.length),
                  style: StitchTheme.body(size: 14, color: StitchTheme.muted),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Static "Museums on this app" directory — presentation-only metadata.
// Not wired to any API. Does not start a tour or open a room.
// ---------------------------------------------------------------------------

/// Hardcoded museum cards shown on the Explore empty state.
///
/// FLAG: Third entry uses `Lovuran.png` as the image asset the team provided.
/// Filename appears to reference the Louvre, but name / description / location
/// are intentionally left as placeholders until the team confirms details.
class _SupportedMuseum {
  const _SupportedMuseum({
    required this.name,
    required this.locationTag,
    required this.locationFull,
    required this.description,
    required this.imageAsset,
    this.isPlaceholder = false,
  });

  final String name;
  final String locationTag;
  final String locationFull;
  final String description;
  final String imageAsset;
  final bool isPlaceholder;
}

const List<_SupportedMuseum> _supportedMuseums = <_SupportedMuseum>[
  _SupportedMuseum(
    name: 'Adwa Museum',
    locationTag: 'Adwa Museum · Adwa, Tigray',
    locationFull: 'Adwa, Tigray Region, Ethiopia',
    description:
        'Dedicated to the Battle of Adwa (1896), where Ethiopian forces '
        'defeated an invading Italian army — one of the only successful '
        'African resistances to European colonization.',
    imageAsset: 'assets/images/outerimages/adwa.png',
  ),
  _SupportedMuseum(
    name: 'National Museum of Ethiopia',
    locationTag: '6 Kilo Museum · Addis Ababa',
    locationFull:
        'King George VI Street, Addis Ababa, near Addis Ababa '
        "University's graduate school",
    description:
        'Home to "Lucy" (Dinkinesh), the 3.2-million-year-old '
        'Australopithecus afarensis fossil that reshaped understanding of '
        'human origins, alongside Ethiopian manuscripts and royal artifacts.',
    imageAsset: 'assets/images/outerimages/6killo.png',
  ),
  // PLACEHOLDER — do not invent details. Confirm name, description, location,
  // and whether Lovuran.png is the correct image with the team.
  _SupportedMuseum(
    name: '[Third museum — TBD]',
    locationTag: 'Location to be confirmed',
    locationFull: 'Location to be confirmed with the team',
    description:
        'PLACEHOLDER: Name, description, location, and final image for this '
        'museum are pending team confirmation. Do not treat this card as '
        'final content.',
    imageAsset: 'assets/images/outerimages/Lovuran.png',
    isPlaceholder: true,
  ),
];

/// Empty Explore state: existing scan CTA + museums directory section.
class _ExploreEmptyState extends StatelessWidget {
  const _ExploreEmptyState({required this.strings, required this.onScan});

  final AppStrings strings;
  final VoidCallback? onScan;

  void _openOverview(BuildContext context, _SupportedMuseum museum) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => _MuseumOverviewScreen(museum: museum),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return CustomScrollView(
      slivers: <Widget>[
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(32, 48, 32, 8),
            child: Column(
              children: <Widget>[
                const Icon(
                  Icons.qr_code_scanner,
                  size: 56,
                  color: StitchTheme.muted,
                ),
                const SizedBox(height: 20),
                Text(
                  strings.scanToStartTour,
                  textAlign: TextAlign.center,
                  style: StitchTheme.headline(
                    size: 24,
                    color: StitchTheme.parchment,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  strings.scanToStartTourBody,
                  textAlign: TextAlign.center,
                  style: StitchTheme.body(size: 16, color: StitchTheme.muted),
                ),
                const SizedBox(height: 24),
                FilledButton.icon(
                  onPressed: onScan,
                  style: FilledButton.styleFrom(
                    backgroundColor: StitchTheme.adwaGold,
                    foregroundColor: StitchTheme.ink,
                  ),
                  icon: const Icon(Icons.qr_code_scanner),
                  label: Text(strings.scan),
                ),
              ],
            ),
          ),
        ),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 36, 24, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  'MUSEUMS ON THIS APP',
                  style: StitchTheme.overline(
                    size: 12,
                    color: StitchTheme.muted,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Informational only — scan a room QR to start a tour.',
                  style: StitchTheme.body(size: 15, color: StitchTheme.muted),
                ),
              ],
            ),
          ),
        ),
        SliverToBoxAdapter(
          child: SizedBox(
            height: 280,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _supportedMuseums.length,
              itemBuilder: (BuildContext context, int index) {
                final _SupportedMuseum museum = _supportedMuseums[index];
                return _MuseumCard(
                  museum: museum,
                  onTap: () => _openOverview(context, museum),
                );
              },
            ),
          ),
        ),
        const SliverToBoxAdapter(child: SizedBox(height: 48)),
      ],
    );
  }
}

class _MuseumCard extends StatelessWidget {
  const _MuseumCard({required this.museum, required this.onTap});

  final _SupportedMuseum museum;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 16),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(14),
          child: SizedBox(
            width: 240,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(14),
                    child: Stack(
                      fit: StackFit.expand,
                      children: <Widget>[
                        Image.asset(
                          museum.imageAsset,
                          fit: BoxFit.cover,
                          errorBuilder:
                              (_, __, ___) =>
                                  const ColoredBox(color: StitchTheme.panel),
                        ),
                        if (museum.isPlaceholder)
                          Align(
                            alignment: Alignment.topLeft,
                            child: Padding(
                              padding: const EdgeInsets.all(10),
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: StitchTheme.panel,
                                  borderRadius: BorderRadius.circular(999),
                                ),
                                child: Text(
                                  'PLACEHOLDER',
                                  style: StitchTheme.overline(
                                    size: 10,
                                    color: StitchTheme.muted,
                                  ),
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  museum.name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: StitchTheme.headline(
                    size: 20,
                    color: StitchTheme.parchment,
                    weight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  museum.locationTag,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: StitchTheme.body(size: 14, color: StitchTheme.muted),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Informational museum overview — no tour start, no room navigation.
class _MuseumOverviewScreen extends StatelessWidget {
  const _MuseumOverviewScreen({required this.museum});

  final _SupportedMuseum museum;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: StitchTheme.darkText,
      body: CustomScrollView(
        slivers: <Widget>[
          SliverAppBar(
            expandedHeight: 280,
            pinned: true,
            backgroundColor: StitchTheme.darkText,
            foregroundColor: StitchTheme.ink,
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                fit: StackFit.expand,
                children: <Widget>[
                  Image.asset(
                    museum.imageAsset,
                    fit: BoxFit.cover,
                    errorBuilder:
                        (_, __, ___) =>
                            const ColoredBox(color: StitchTheme.panel),
                  ),
                  DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: <Color>[
                          Colors.transparent,
                          StitchTheme.heroScrim.withValues(alpha: 0.75),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 24, 24, 48),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  if (museum.isPlaceholder) ...<Widget>[
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: StitchTheme.ember,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        'PLACEHOLDER — CONFIRM WITH TEAM',
                        style: StitchTheme.overline(
                          size: 10,
                          color: StitchTheme.muted,
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),
                  ],
                  Text(
                    museum.name,
                    style: StitchTheme.headline(
                      size: 32,
                      color: StitchTheme.parchment,
                      height: 1.1,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      const Padding(
                        padding: EdgeInsets.only(top: 2),
                        child: Icon(
                          Icons.place_outlined,
                          size: 18,
                          color: StitchTheme.adwaGold,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          museum.locationFull,
                          style: StitchTheme.body(
                            size: 15,
                            color: StitchTheme.muted,
                            height: 1.4,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  Text(
                    museum.description,
                    style: StitchTheme.body(
                      size: 16,
                      color: StitchTheme.parchment,
                      height: 1.55,
                    ),
                  ),
                  const SizedBox(height: 28),
                  Text(
                    'To visit rooms in this museum, scan a room QR code. '
                    'This overview does not start a tour.',
                    style: StitchTheme.body(
                      size: 14,
                      color: StitchTheme.muted,
                      height: 1.45,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
