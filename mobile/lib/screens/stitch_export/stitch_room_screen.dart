import 'package:flutter/material.dart';
import 'package:just_audio/just_audio.dart';

import '../../l10n/app_strings.dart';
import '../../models/chat_args.dart';
import '../../models/item.dart';
import '../../models/item_detail_args.dart';
import '../../models/museum_room_summary.dart';
import '../../models/room.dart';
import '../../services/api_service.dart';
import '../../services/ticket_gate.dart';
import '../../services/tour_session.dart';
import '../../widgets/ai_guide_progress_card.dart';
import '../../widgets/journey_trail_card.dart';
import '../../widgets/museum_network_image.dart';
import '../../widgets/settings_icon_button.dart';
import 'stitch_chat_screen.dart';
import 'stitch_routes.dart';
import 'stitch_theme.dart';

/// Room screen — opened after a successful QR scan / waypoint fetch.
///
/// Next room always uses [Room.nextRoomId] only — never a hardcoded sequence.
class StitchRoomScreen extends StatefulWidget {
  const StitchRoomScreen({super.key, required this.room});

  final Room room;

  @override
  State<StitchRoomScreen> createState() => _StitchRoomScreenState();
}

class _StitchRoomScreenState extends State<StitchRoomScreen> {
  final ApiService _api = ApiService();
  late Room _room;
  List<MuseumRoomSummary>? _museumRoomList;
  Duration? _narrationDuration;
  bool _loadingNext = false;

  @override
  void initState() {
    super.initState();
    _room = widget.room;
    TourSession.noteRoomOpened(_room);
    _loadMuseumRoomList();
    _loadNarrationDuration();
  }

  @override
  void dispose() {
    _api.dispose();
    super.dispose();
  }

  String? get _heroImageUrl =>
      _room.items.isNotEmpty ? _room.items.first.imageUrl : null;

  Future<void> _loadMuseumRoomList() async {
    try {
      final List<MuseumRoomSummary>? rooms = await _api.getMuseumRoomList(
        museumScope: _room.museumScope,
      );
      if (mounted) {
        setState(() => _museumRoomList = rooms);
      }
    } on UnsupportedError {
      // Real backend has no room-list endpoint; keep the growing trail.
    } catch (_) {
      // Trail enhancement must never block room content or navigation.
    }
  }

  Future<void> _loadNarrationDuration() async {
    final String url = _room.roomAudioUrl.trim();
    if (url.isEmpty) {
      return;
    }

    final AudioPlayer metadataPlayer = AudioPlayer();
    try {
      final Duration? duration =
          url.startsWith('http://') || url.startsWith('https://')
              ? await metadataPlayer.setUrl(url)
              : await metadataPlayer.setAsset(url);
      if (mounted) {
        setState(() => _narrationDuration = duration);
      }
    } catch (_) {
      // Duration is supplementary card metadata; room content still works.
    } finally {
      await metadataPlayer.dispose();
    }
  }

  String _formatDuration(Duration? duration) {
    if (duration == null) {
      return '--:--';
    }
    final int minutes = duration.inMinutes;
    final int seconds = duration.inSeconds.remainder(60);
    return '$minutes:${seconds.toString().padLeft(2, '0')}';
  }

  Future<void> _openNextRoom() async {
    // Dynamic chain only — whatever nextRoomId the backend returned.
    final String? nextId = _room.nextRoomId;
    if (nextId == null || _loadingNext) {
      return;
    }

    setState(() => _loadingNext = true);
    try {
      final Room next = await _api.getWaypoint(nextId);
      if (!mounted) {
        return;
      }

      final bool granted = await TicketGate.ensureAccess(context, room: next);
      if (!mounted || !granted) {
        return;
      }

      await Navigator.pushReplacementNamed(
        context,
        StitchRoutes.room,
        arguments: next,
      );
    } on ApiException catch (e) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message), backgroundColor: StitchTheme.panel),
      );
    } finally {
      if (mounted) {
        setState(() => _loadingNext = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final AppStrings s = AppStrings.of(context);

    return Scaffold(
      backgroundColor: StitchTheme.darkText,
      floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,
      floatingActionButton: FloatingActionButton(
        heroTag: 'room-ai-guide',
        tooltip: s.chatWithAiGuideTooltip,
        onPressed:
            () => showStitchChatSheet(
              context,
              args: ChatArgs(waypointId: _room.id, contextTitle: _room.title),
            ),
        backgroundColor: StitchTheme.adwaGold,
        foregroundColor: StitchTheme.ink,
        elevation: 8,
        shape: const CircleBorder(
          side: BorderSide(color: StitchTheme.panel, width: 2),
        ),
        child: const Icon(Icons.chat_bubble_outline),
      ),
      body: CustomScrollView(
        slivers: <Widget>[
          SliverAppBar(
            expandedHeight: 320,
            pinned: true,
            backgroundColor: StitchTheme.darkText,
            foregroundColor: StitchTheme.parchment,
            actions: const <Widget>[SettingsIconButton()],
            flexibleSpace: FlexibleSpaceBar(
              background:
                  _heroImageUrl == null
                      ? const ColoredBox(color: StitchTheme.panel)
                      : MuseumNetworkImage(
                        url: _heroImageUrl!,
                        fit: BoxFit.cover,
                        fallback: const ColoredBox(color: StitchTheme.panel),
                      ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 24, 24, 120),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    s.roomNumber(_room.storyOrder),
                    style: StitchTheme.overline(
                      size: 11,
                      color: StitchTheme.muted,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _room.title,
                    style: StitchTheme.headline(
                      size: 32,
                      color: StitchTheme.parchment,
                      weight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 16),
                  JourneyTrailCard(
                    visitedRooms: TourSession.visitedRooms,
                    currentRoomId: _room.id,
                    hasNextRoom: _room.nextRoomId != null,
                    fullRoomList: _museumRoomList,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    _room.roomOverviewText,
                    style: StitchTheme.body(
                      size: 17,
                      color: StitchTheme.muted,
                      height: 1.55,
                    ),
                  ),
                  if (_room.roomAudioUrl.isNotEmpty) ...<Widget>[
                    const SizedBox(height: 20),
                    AiGuideProgressCard(
                      audioUrl: _room.roomAudioUrl,
                      chapterLabel: s.chapter(_room.storyOrder, _room.title),
                      transcriptText: _room.roomOverviewText,
                    ),
                  ],
                  const SizedBox(height: 28),
                  Text(
                    s.inThisRoom,
                    style: StitchTheme.headline(
                      size: 24,
                      color: StitchTheme.parchment,
                      weight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 12),
                  if (_room.items.isEmpty)
                    Text(
                      s.noItemsYet,
                      style: StitchTheme.body(
                        size: 16,
                        color: StitchTheme.muted,
                      ),
                    )
                  else
                    ..._room.items.map(_itemTile),
                  if (_room.nextRoomId != null) ...<Widget>[
                    const SizedBox(height: 28),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        onPressed: _loadingNext ? null : _openNextRoom,
                        style: FilledButton.styleFrom(
                          backgroundColor: StitchTheme.adwaGold,
                          foregroundColor: StitchTheme.ink,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(999),
                          ),
                        ),
                        icon:
                            _loadingNext
                                ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: StitchTheme.ink,
                                  ),
                                )
                                : const Icon(Icons.arrow_forward),
                        label: Text(
                          _loadingNext ? s.loading : s.continueNextRoom,
                          style: StitchTheme.body(
                            size: 16,
                            weight: FontWeight.w700,
                            color: StitchTheme.ink,
                          ),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _itemTile(Item item) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: StitchTheme.panel,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () {
            Navigator.pushNamed(
              context,
              StitchRoutes.item,
              arguments: ItemDetailArgs(
                item: item,
                waypointId: _room.id,
                narrationAudioUrl: _room.roomAudioUrl,
                storyOrder: _room.storyOrder,
              ),
            );
          },
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: <Widget>[
                ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: MuseumNetworkImage(
                    url: item.imageUrl,
                    width: 72,
                    height: 72,
                    fit: BoxFit.cover,
                    fallback: Container(
                      width: 72,
                      height: 72,
                      color: StitchTheme.obsidian,
                      alignment: Alignment.center,
                      child: const Icon(
                        Icons.image_not_supported_outlined,
                        color: StitchTheme.muted,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(
                        item.name,
                        style: StitchTheme.headline(
                          size: 18,
                          color: StitchTheme.parchment,
                          weight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: <Widget>[
                          const Icon(
                            Icons.headphones_outlined,
                            size: 14,
                            color: StitchTheme.muted,
                          ),
                          const SizedBox(width: 5),
                          Text(
                            _formatDuration(_narrationDuration),
                            style: StitchTheme.body(
                              size: 13,
                              color: StitchTheme.muted,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
