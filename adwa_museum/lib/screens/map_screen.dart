import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme.dart';
import '../widgets/footer_nav.dart';

/// Nearby museums map screen with custom-drawn map visualization.
///
/// Converted from map.tsx. Displays positioned pin markers on a stylized
/// gradient map, a "You are here" info card, and a venue list below.
class MapScreen extends StatelessWidget {
  const MapScreen({super.key, required this.onNavTap});

  final ValueChanged<int> onNavTap;

  static const _pins = [
    _Pin(name: 'Heritage Gallery', dist: '0.4 km', top: 0.34, left: 0.42),
    _Pin(name: 'Palazzo della Luce', dist: '1.2 km', top: 0.58, left: 0.62),
    _Pin(name: 'Museum of Antiquities', dist: '2.8 km', top: 0.22, left: 0.70),
    _Pin(name: 'Linea Contemporary', dist: '3.5 km', top: 0.72, left: 0.28),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.darkGray,
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ScreenHeader(title: 'Map', onBack: () => onNavTap(0)),

                  const SizedBox(height: 24),

                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Nearby',
                          style: AppTheme.display(
                            fontSize: 28,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Four venues within walking distance.',
                          style: AppTheme.ui(
                            fontSize: 14,
                            color: AppColors.parchment.withValues(alpha: 0.6),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Map visualization
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Container(
                      height: 360,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: AppColors.white.withValues(alpha: 0.1),
                        ),
                        gradient: const LinearGradient(
                          begin: Alignment(-0.5, -0.5),
                          end: Alignment(0.5, 0.5),
                          colors: [Color(0xFF2B2B2B), Color(0xFF3D3230)],
                        ),
                      ),
                      child: Stack(
                        clipBehavior: Clip.none,
                        children: [
                          // Subtle radial glows
                          Positioned.fill(
                            child: Container(
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(16),
                                gradient: RadialGradient(
                                  center: const Alignment(-0.4, -0.6),
                                  radius: 0.7,
                                  colors: [
                                    AppColors.gold.withValues(alpha: 0.15),
                                    Colors.transparent,
                                  ],
                                ),
                              ),
                            ),
                          ),
                          Positioned.fill(
                            child: Container(
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(16),
                                gradient: RadialGradient(
                                  center: const Alignment(0.6, 0.4),
                                  radius: 0.7,
                                  colors: [
                                    AppColors.ember.withValues(alpha: 0.25),
                                    Colors.transparent,
                                  ],
                                ),
                              ),
                            ),
                          ),

                          // Grid lines
                          CustomPaint(
                            size: const Size(double.infinity, 360),
                            painter: _GridPainter(),
                          ),

                          // Pins
                          for (final pin in _pins)
                            Positioned(
                              top: pin.top * 360 - 10,
                              left:
                                  pin.left *
                                      (MediaQuery.of(context).size.width - 48) -
                                  10,
                              child: _MapPin(),
                            ),

                          // "You are here" card
                          Positioned(
                            left: 16,
                            right: 16,
                            bottom: 16,
                            child: Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: AppColors.parchment.withValues(
                                  alpha: 0.95,
                                ),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'YOU ARE HERE',
                                    style: AppTheme.overline(
                                      color: AppColors.gold,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Piazza del Popolo',
                                    style: AppTheme.display(
                                      fontSize: 18,
                                      color: AppColors.ink,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Venue list
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Column(
                      children:
                          _pins.map((p) {
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 14,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors.white.withValues(
                                    alpha: 0.05,
                                  ),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 8,
                                      height: 8,
                                      decoration: const BoxDecoration(
                                        shape: BoxShape.circle,
                                        color: AppColors.gold,
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Text(
                                        p.name,
                                        style: AppTheme.display(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w400,
                                        ),
                                      ),
                                    ),
                                    Text(
                                      p.dist.toUpperCase(),
                                      style: AppTheme.ui(
                                        fontSize: 12,
                                        letterSpacing: 2,
                                        color: AppColors.parchment.withValues(
                                          alpha: 0.6,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          }).toList(),
                    ),
                  ),

                  const SizedBox(height: 16),
                ],
              ),
            ),
          ),
          FooterNav(currentIndex: 1, onTap: onNavTap),
        ],
      ),
    );
  }
}

// ── Data model ──────────────────────────────────────────────────────────

class _Pin {
  final String name;
  final String dist;
  final double top;
  final double left;
  const _Pin({
    required this.name,
    required this.dist,
    required this.top,
    required this.left,
  });
}

// ── Map pin widget ──────────────────────────────────────────────────────

class _MapPin extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 20,
      height: 20,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: AppColors.gold,
        boxShadow: [
          BoxShadow(
            color: AppColors.gold.withValues(alpha: 0.2),
            blurRadius: 0,
            spreadRadius: 6,
          ),
        ],
      ),
      child: Center(
        child: Container(
          width: 8,
          height: 8,
          decoration: const BoxDecoration(
            shape: BoxShape.circle,
            color: AppColors.white,
          ),
        ),
      ),
    );
  }
}

// ── Grid line painter ───────────────────────────────────────────────────

class _GridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint =
        Paint()
          ..color = AppColors.parchment.withValues(alpha: 0.06)
          ..strokeWidth = 1;

    // Horizontal lines
    canvas.drawLine(
      Offset(0, size.height * 0.2),
      Offset(size.width, size.height * 0.3),
      paint,
    );
    canvas.drawLine(
      Offset(0, size.height * 0.5),
      Offset(size.width, size.height * 0.6),
      paint,
    );
    canvas.drawLine(
      Offset(0, size.height * 0.8),
      Offset(size.width, size.height * 0.75),
      paint,
    );

    // Vertical lines
    canvas.drawLine(
      Offset(size.width * 0.3, 0),
      Offset(size.width * 0.25, size.height),
      paint,
    );
    canvas.drawLine(
      Offset(size.width * 0.65, 0),
      Offset(size.width * 0.7, size.height),
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
