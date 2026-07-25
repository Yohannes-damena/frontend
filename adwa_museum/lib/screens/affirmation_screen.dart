import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme.dart';

/// Success interstitial after ticket validation.
///
/// Shows an animated gold checkmark, welcome message, and auto-advances
/// to the Home Screen after 2.5 seconds. Tap anywhere to skip.
class AffirmationScreen extends StatefulWidget {
  const AffirmationScreen({super.key});

  @override
  State<AffirmationScreen> createState() => _AffirmationScreenState();
}

class _AffirmationScreenState extends State<AffirmationScreen>
    with TickerProviderStateMixin {
  late final AnimationController _checkController;
  late final AnimationController _textController;
  late final AnimationController _particleController;
  late final AnimationController _progressController;
  Timer? _autoAdvance;

  @override
  void initState() {
    super.initState();

    // Checkmark stroke draw
    _checkController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );

    // Text fade-in
    _textController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );

    // Particle burst
    _particleController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );

    // Progress bar
    _progressController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2500),
    );

    // Staggered start
    _checkController.forward();
    _particleController.forward();
    Future.delayed(const Duration(milliseconds: 400), () {
      if (mounted) _textController.forward();
    });
    _progressController.forward();

    // Auto-advance after 2.5s
    _autoAdvance = Timer(const Duration(milliseconds: 2500), _goHome);
  }

  void _goHome() {
    if (!mounted) return;
    Navigator.pushNamedAndRemoveUntil(context, '/home', (_) => false);
  }

  @override
  void dispose() {
    _checkController.dispose();
    _textController.dispose();
    _particleController.dispose();
    _progressController.dispose();
    _autoAdvance?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _goHome,
      child: Scaffold(
        body: Container(
          width: double.infinity,
          height: double.infinity,
          color: AppColors.darkGray,
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Particle burst
              AnimatedBuilder(
                animation: _particleController,
                builder:
                    (_, __) => CustomPaint(
                      size: Size(
                        MediaQuery.of(context).size.width,
                        MediaQuery.of(context).size.height,
                      ),
                      painter: _ParticlePainter(
                        progress: _particleController.value,
                      ),
                    ),
              ),

              // Center content
              Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Animated checkmark
                  AnimatedBuilder(
                    animation: _checkController,
                    builder:
                        (_, __) => Container(
                          width: 80,
                          height: 80,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: AppColors.gold.withValues(
                                alpha: _checkController.value,
                              ),
                              width: 2,
                            ),
                          ),
                          child: CustomPaint(
                            painter: _CheckmarkPainter(
                              progress: Curves.easeOut.transform(
                                _checkController.value,
                              ),
                              color: AppColors.gold,
                            ),
                          ),
                        ),
                  ),

                  const SizedBox(height: 32),

                  // Primary text
                  FadeTransition(
                    opacity: _textController,
                    child: SlideTransition(
                      position: Tween<Offset>(
                        begin: const Offset(0, 0.15),
                        end: Offset.zero,
                      ).animate(
                        CurvedAnimation(
                          parent: _textController,
                          curve: Curves.easeOut,
                        ),
                      ),
                      child: Text(
                        'Welcome to the Museum',
                        textAlign: TextAlign.center,
                        style: AppTheme.display(
                          fontSize: 32,
                          fontWeight: FontWeight.w700,
                          color: AppColors.parchment,
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 12),

                  // Secondary text
                  FadeTransition(
                    opacity: CurvedAnimation(
                      parent: _textController,
                      curve: const Interval(0.3, 1.0, curve: Curves.easeOut),
                    ),
                    child: Text(
                      'Your journey begins now',
                      style: AppTheme.ui(
                        fontSize: 16,
                        fontWeight: FontWeight.w300,
                        color: AppColors.white.withValues(alpha: 0.7),
                      ),
                    ),
                  ),
                ],
              ),

              // Progress bar at bottom
              Positioned(
                left: 80,
                right: 80,
                bottom: 60,
                child: AnimatedBuilder(
                  animation: _progressController,
                  builder:
                      (_, __) => Container(
                        height: 2,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(1),
                          color: AppColors.parchment.withValues(alpha: 0.1),
                        ),
                        alignment: Alignment.centerLeft,
                        child: FractionallySizedBox(
                          widthFactor: _progressController.value,
                          child: Container(
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(1),
                              color: AppColors.gold.withValues(alpha: 0.6),
                            ),
                          ),
                        ),
                      ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Checkmark painter ───────────────────────────────────────────────────

class _CheckmarkPainter extends CustomPainter {
  _CheckmarkPainter({required this.progress, required this.color});
  final double progress;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    if (progress <= 0) return;

    final paint =
        Paint()
          ..color = color
          ..strokeWidth = 3
          ..strokeCap = StrokeCap.round
          ..style = PaintingStyle.stroke;

    final path =
        Path()
          ..moveTo(size.width * 0.25, size.height * 0.5)
          ..lineTo(size.width * 0.42, size.height * 0.65)
          ..lineTo(size.width * 0.72, size.height * 0.35);

    final metrics = path.computeMetrics().first;
    final drawn = metrics.extractPath(0, metrics.length * progress);
    canvas.drawPath(drawn, paint);
  }

  @override
  bool shouldRepaint(_CheckmarkPainter old) => old.progress != progress;
}

// ── Particle burst painter ──────────────────────────────────────────────

class _ParticlePainter extends CustomPainter {
  _ParticlePainter({required this.progress});
  final double progress;

  static final _rng = Random(42);
  static final _particles = List.generate(24, (_) {
    return _Particle(
      angle: _rng.nextDouble() * 2 * pi,
      speed: 80 + _rng.nextDouble() * 160,
      size: 2 + _rng.nextDouble() * 3,
    );
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (progress <= 0) return;

    final center = Offset(size.width / 2, size.height / 2);
    final opacity = (1.0 - progress).clamp(0.0, 1.0);

    for (final p in _particles) {
      final dx = cos(p.angle) * p.speed * progress;
      final dy = sin(p.angle) * p.speed * progress;
      final paint =
          Paint()..color = AppColors.gold.withValues(alpha: opacity * 0.6);
      canvas.drawCircle(
        center + Offset(dx, dy),
        p.size * (1 - progress * 0.5),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(_ParticlePainter old) => old.progress != progress;
}

class _Particle {
  final double angle;
  final double speed;
  final double size;
  const _Particle({
    required this.angle,
    required this.speed,
    required this.size,
  });
}
