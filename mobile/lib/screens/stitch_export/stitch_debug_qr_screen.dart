import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../models/room.dart';
import '../../services/api_service.dart';
import 'stitch_theme.dart';

/// DEBUG ONLY — scannable QR for the configured demo room ids.
///
/// Reachable only when [ApiService.enableDebugTools] is `true`, via a Settings
/// title long-press. That covers live builds too, so a real deployment can be
/// driven without printed codes, but never a release build: the route, the
/// Settings entry, and this screen are all disabled there.
class StitchDebugQrScreen extends StatefulWidget {
  const StitchDebugQrScreen({super.key});

  @override
  State<StitchDebugQrScreen> createState() => _StitchDebugQrScreenState();
}

class _StitchDebugQrScreenState extends State<StitchDebugQrScreen> {
  final ApiService _api = ApiService();
  List<Room>? _rooms;
  String? _error;
  int _selectedIndex = 0;

  @override
  void initState() {
    super.initState();
    // Hard gate — never run debug QR tooling in a release build.
    assert(
      ApiService.enableDebugTools,
      'Debug QR screen requires enableDebugTools',
    );
    if (!ApiService.enableDebugTools) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          Navigator.of(context).pop();
        }
      });
      return;
    }
    _loadRooms();
  }

  @override
  void dispose() {
    _api.dispose();
    super.dispose();
  }

  Future<void> _loadRooms() async {
    try {
      final List<Room> rooms = await Future.wait(
        ApiService.demoRoomIds.map(_api.getWaypoint),
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _rooms = rooms;
        _error = null;
      });
    } on ApiException catch (e) {
      if (!mounted) {
        return;
      }
      setState(() => _error = e.message);
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() => _error = 'Could not load mock rooms.');
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!ApiService.enableDebugTools) {
      return const Scaffold(
        backgroundColor: StitchTheme.darkText,
        body: SizedBox.shrink(),
      );
    }

    final List<Room>? rooms = _rooms;
    final Room? selected =
        rooms == null || rooms.isEmpty
            ? null
            : rooms[_selectedIndex.clamp(0, rooms.length - 1)];

    return Scaffold(
      backgroundColor: StitchTheme.darkText,
      appBar: AppBar(
        backgroundColor: StitchTheme.darkText,
        foregroundColor: StitchTheme.ink,
        title: Text(
          'Debug QR',
          style: StitchTheme.headline(size: 22, color: StitchTheme.parchment),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              Text(
                'MOCK ONLY',
                style: StitchTheme.overline(size: 11, color: StitchTheme.muted),
              ),
              const SizedBox(height: 8),
              Text(
                'Scan this code with a second phone to test Scanner → Room.',
                style: StitchTheme.body(
                  size: 15,
                  color: StitchTheme.muted,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 20),
              if (_error != null)
                Text(
                  _error!,
                  style: StitchTheme.body(size: 15, color: StitchTheme.deepRed),
                )
              else if (rooms == null)
                const Expanded(
                  child: Center(
                    child: CircularProgressIndicator(color: StitchTheme.adwaGold),
                  ),
                )
              else ...<Widget>[
                Text(
                  'MOCK ROOM',
                  style: StitchTheme.overline(size: 11, color: StitchTheme.muted),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  decoration: BoxDecoration(
                    color: StitchTheme.panel,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<int>(
                      value: _selectedIndex,
                      isExpanded: true,
                      dropdownColor: StitchTheme.panel,
                      style: StitchTheme.body(
                        size: 16,
                        color: StitchTheme.parchment,
                        weight: FontWeight.w600,
                      ),
                      items: List<DropdownMenuItem<int>>.generate(
                        rooms.length,
                        (int index) {
                          final Room room = rooms[index];
                          return DropdownMenuItem<int>(
                            value: index,
                            child: Text(
                              'Room ${room.storyOrder} · ${room.title}',
                              overflow: TextOverflow.ellipsis,
                            ),
                          );
                        },
                      ),
                      onChanged: (int? value) {
                        if (value != null) {
                          setState(() => _selectedIndex = value);
                        }
                      },
                    ),
                  ),
                ),
                const SizedBox(height: 28),
                Expanded(
                  child: Center(
                    child: selected == null
                        ? const SizedBox.shrink()
                        : Container(
                            padding: const EdgeInsets.all(20),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: QrImageView(
                              data: selected.id,
                              version: QrVersions.auto,
                              size: 260,
                              backgroundColor: Colors.white,
                              eyeStyle: const QrEyeStyle(
                                eyeShape: QrEyeShape.square,
                                color: Color(0xFF1B1712),
                              ),
                              dataModuleStyle: const QrDataModuleStyle(
                                dataModuleShape: QrDataModuleShape.square,
                                color: Color(0xFF1B1712),
                              ),
                            ),
                          ),
                  ),
                ),
                if (selected != null) ...<Widget>[
                  const SizedBox(height: 12),
                  Text(
                    selected.id,
                    textAlign: TextAlign.center,
                    style: StitchTheme.body(
                      size: 11,
                      color: StitchTheme.muted,
                    ),
                  ),
                ],
              ],
            ],
          ),
        ),
      ),
    );
  }
}
