import 'package:flutter/material.dart';

import '../../services/tour_session.dart';
import 'stitch_museum_hub_screen.dart';
import 'stitch_scanner_screen.dart';
import 'stitch_theme.dart';

/// Main post-entry shell: Explore + Scan.
class StitchAppShell extends StatefulWidget {
  const StitchAppShell({super.key, this.initialIndex = 0});

  final int initialIndex;

  @override
  State<StitchAppShell> createState() => _StitchAppShellState();
}

class _StitchAppShellState extends State<StitchAppShell> {
  late int _currentIndex;

  static const int _tabCount = 2;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex.clamp(0, _tabCount - 1);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _currentIndex == 0
          ? StitchMuseumHubScreen(
              key: ValueKey<String>(TourSession.tourStartRoomId ?? 'no-tour'),
              showBottomNav: false,
              onSwitchToScan: () => setState(() => _currentIndex = 1),
            )
          : const StitchScannerScreen(showBottomNav: false),
      bottomNavigationBar: StitchBottomNav(
        activeIndex: _currentIndex,
        onTap: (int index) => setState(() => _currentIndex = index),
      ),
    );
  }
}
