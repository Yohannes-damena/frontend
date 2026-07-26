import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Shared visual tokens for Stitch-exported pages.
class StitchTheme {
  StitchTheme._();

  // Warm, light museum palette. Legacy token names are retained to keep the
  // Stitch screens stable while their values now map to semantic light roles.
  static const Color parchment = Color(0xFF251F18); // Primary text
  static const Color parchmentLight = Color(0xFFFFFFFF); // Elevated surface
  static const Color darkText = Color(0xFFFCF8F0); // App background
  static const Color ink = Color(0xFF251F18);
  static const Color heroText = Color(0xFFFFF8EA);
  static const Color heroScrim = Color(0xFF1B1712);
  static const Color slate = Color(0xFF756B5E);
  static const Color adwaGold = Color(0xFFC08A2E); // Primary accent
  static const Color charcoal = Color(0xFF4A433B);
  static const Color muted = Color(0xFF71685D); // Secondary text & dividers
  static const Color panel = Color(0xFFFFFFFF); // Cards & surfaces
  static const Color ember = Color(0xFFF0DDD8); // Inactive state
  static const Color obsidian = Color(0xFFEAE1D3); // Inputs & floating nav
  static const Color deepRed = Color(
    0xFF7F1425,
  ); // Alternate active-state accent

  static TextStyle headline({
    double size = 28,
    FontWeight weight = FontWeight.w600,
    Color color = darkText,
    double? letterSpacing,
    double? height,
  }) {
    return GoogleFonts.bodoniModa(
      fontSize: size,
      fontWeight: weight,
      color: color,
      letterSpacing: letterSpacing,
      height: height,
    );
  }

  static TextStyle body({
    double size = 16,
    FontWeight weight = FontWeight.w400,
    Color color = darkText,
    double? letterSpacing,
    double? height,
  }) {
    return GoogleFonts.manrope(
      fontSize: size,
      fontWeight: weight,
      color: color,
      letterSpacing: letterSpacing,
      height: height,
    );
  }

  static TextStyle overline({
    double size = 12,
    FontWeight weight = FontWeight.w600,
    Color color = muted,
    double letterSpacing = 2.0,
  }) {
    return GoogleFonts.manrope(
      fontSize: size,
      fontWeight: weight,
      color: color,
      letterSpacing: letterSpacing,
    );
  }
}

/// Reusable docked nav used by Stitch pages.
///
/// DESIGN_SYSTEM v2 §3: glass/blur is allowed only on floating bottom bars.
/// Active state uses Adwa Gold on the icon only — no gold fill halo.
class StitchBottomNav extends StatelessWidget {
  const StitchBottomNav({super.key, required this.activeIndex, this.onTap});

  final int activeIndex;
  final ValueChanged<int>? onTap;

  static const List<IconData> _outlineIcons = <IconData>[
    Icons.explore_outlined,
    Icons.qr_code_scanner_outlined,
  ];

  static const List<IconData> _filledIcons = <IconData>[
    Icons.explore,
    Icons.qr_code_scanner,
  ];

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(32),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                color: StitchTheme.panel.withValues(alpha: 0.92),
                borderRadius: BorderRadius.circular(32),
                border: Border.all(
                  color: StitchTheme.muted.withValues(alpha: 0.18),
                ),
                boxShadow: <BoxShadow>[
                  BoxShadow(
                    color: StitchTheme.ink.withValues(alpha: 0.14),
                    blurRadius: 20,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: List<Widget>.generate(_outlineIcons.length, (
                  int index,
                ) {
                  final bool isActive = index == activeIndex;
                  return Material(
                    color: Colors.transparent,
                    child: InkWell(
                      customBorder: const CircleBorder(),
                      onTap: onTap == null ? null : () => onTap!(index),
                      child: Padding(
                        padding: const EdgeInsets.all(10),
                        child: Icon(
                          isActive ? _filledIcons[index] : _outlineIcons[index],
                          color:
                              isActive
                                  ? StitchTheme.adwaGold
                                  : StitchTheme.muted,
                        ),
                      ),
                    ),
                  );
                }),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
