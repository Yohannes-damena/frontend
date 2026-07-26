import 'package:flutter/material.dart';

import '../../l10n/app_strings.dart';
import '../../models/room.dart';
import '../../services/api_service.dart';
import '../../services/ticket_gate.dart';
import '../../widgets/museum_network_image.dart';
import '../../widgets/settings_icon_button.dart';
import 'stitch_routes.dart';
import 'stitch_theme.dart';

/// Museum-agnostic entry screen (DESIGN_SYSTEM.md §6).
///
/// Entry goes straight to the QR scanner. After a room QR resolves, a
/// one-time-per-museum ticket gate may appear before the Room screen.
class StitchWelcomeScreen extends StatelessWidget {
  const StitchWelcomeScreen({super.key});

  void _beginTour(BuildContext context) {
    // Home shell tab index 1 = Scan.
    Navigator.pushReplacementNamed(context, StitchRoutes.home, arguments: 1);
  }

  Future<void> _showMockRoomMenu(BuildContext context) async {
    // Debug affordance only — never in release builds.
    if (!ApiService.enableDebugTools) {
      return;
    }

    final ApiService api = ApiService();
    try {
      final List<Room> rooms = await Future.wait(
        ApiService.demoRoomIds.map(api.getWaypoint),
      );
      if (!context.mounted) {
        return;
      }

      final Room? selected = await showModalBottomSheet<Room>(
        context: context,
        backgroundColor: StitchTheme.panel,
        showDragHandle: true,
        builder: (BuildContext sheetContext) {
          return SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    'Room shortcut',
                    style: StitchTheme.headline(
                      size: 24,
                      color: StitchTheme.parchment,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'DEBUG ONLY · LONG-PRESS MENU',
                    style: StitchTheme.overline(
                      size: 10,
                      color: StitchTheme.muted,
                    ),
                  ),
                  const SizedBox(height: 12),
                  for (final Room room in rooms)
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: CircleAvatar(
                        backgroundColor: StitchTheme.obsidian,
                        foregroundColor: StitchTheme.parchment,
                        child: Text('${room.storyOrder}'),
                      ),
                      title: Text(
                        room.title,
                        style: StitchTheme.body(
                          size: 16,
                          weight: FontWeight.w600,
                          color: StitchTheme.parchment,
                        ),
                      ),
                      subtitle: Text(
                        room.id,
                        style: StitchTheme.body(
                          size: 11,
                          color: StitchTheme.muted,
                        ),
                      ),
                      trailing: const Icon(
                        Icons.arrow_forward,
                        color: StitchTheme.muted,
                      ),
                      onTap: () => Navigator.pop(sheetContext, room),
                    ),
                ],
              ),
            ),
          );
        },
      );

      if (selected != null && context.mounted) {
        final bool granted = await TicketGate.ensureAccess(
          context,
          room: selected,
        );
        if (!context.mounted || !granted) {
          return;
        }
        await Navigator.pushNamed(
          context,
          StitchRoutes.room,
          arguments: selected,
        );
      }
    } on ApiException catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(error.message)));
      }
    } finally {
      api.dispose();
    }
  }

  @override
  Widget build(BuildContext context) {
    final AppStrings s = AppStrings.of(context);
    const Widget scanMark = Icon(
      Icons.qr_code_scanner,
      color: StitchTheme.muted,
      size: 38,
    );

    return Scaffold(
      body: Stack(
        fit: StackFit.expand,
        children: <Widget>[
          const MuseumNetworkImage(
            url: 'assets/images/image.png',
            fit: BoxFit.cover,
            fallback: ColoredBox(color: StitchTheme.darkText),
          ),
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: <Color>[
                  StitchTheme.heroScrim.withValues(alpha: 0.18),
                  StitchTheme.heroScrim.withValues(alpha: 0.42),
                  StitchTheme.heroScrim.withValues(alpha: 0.82),
                ],
              ),
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
              child: Column(
                children: <Widget>[
                  Row(
                    children: <Widget>[
                      const Spacer(),
                      SettingsIconButton(
                        color: StitchTheme.heroText.withValues(alpha: 0.9),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  if (ApiService.enableDebugTools)
                    GestureDetector(
                      behavior: HitTestBehavior.opaque,
                      onLongPress: () => _showMockRoomMenu(context),
                      child: const Padding(
                        padding: EdgeInsets.all(12),
                        child: scanMark,
                      ),
                    )
                  else
                    scanMark,
                  const Spacer(),
                  Text(
                    s.scanToBeginTitle,
                    textAlign: TextAlign.center,
                    style: StitchTheme.headline(
                      size: 48,
                      weight: FontWeight.w600,
                      color: StitchTheme.heroText,
                      height: 1.06,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    s.scanToBeginBody,
                    textAlign: TextAlign.center,
                    style: StitchTheme.body(
                      size: 18,
                      weight: FontWeight.w400,
                      color: StitchTheme.heroText.withValues(alpha: 0.86),
                      height: 1.5,
                    ),
                  ),
                  const Spacer(),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      style: FilledButton.styleFrom(
                        backgroundColor: StitchTheme.adwaGold,
                        foregroundColor: StitchTheme.ink,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(999),
                        ),
                        textStyle: StitchTheme.body(
                          size: 16,
                          weight: FontWeight.w700,
                          color: StitchTheme.ink,
                        ),
                      ),
                      onPressed: () => _beginTour(context),
                      icon: const Icon(Icons.arrow_forward),
                      label: Text(s.beginTour),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
