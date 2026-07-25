import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme.dart';

class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({super.key});

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen>
    with TickerProviderStateMixin {
  late final AnimationController _fadeController;
  late final AnimationController _pulseController;

  late final Animation<double> _logoFade;
  late final Animation<Offset> _logoSlide;
  late final Animation<double> _titleFade;
  late final Animation<Offset> _titleSlide;
  late final Animation<double> _taglineFade;
  late final Animation<Offset> _taglineSlide;
  late final Animation<double> _ctaFade;
  late final Animation<Offset> _ctaSlide;
  late final Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();

    // Staggered fade-in controller (total 1.6s)
    _fadeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1600),
    );

    // Pulsing glow on CTA (infinite loop)
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2400),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    // Logo: 0–400ms
    _logoFade = _interval(0.0, 0.35);
    _logoSlide = _slideInterval(0.0, 0.35);

    // Title: 300–700ms
    _titleFade = _interval(0.2, 0.55);
    _titleSlide = _slideInterval(0.2, 0.55);

    // Tagline: 500–900ms
    _taglineFade = _interval(0.35, 0.7);
    _taglineSlide = _slideInterval(0.35, 0.7);

    // CTA: 700–1200ms
    _ctaFade = _interval(0.5, 0.85);
    _ctaSlide = _slideInterval(0.5, 0.85);

    _fadeController.forward();
  }

  Animation<double> _interval(double begin, double end) {
    return Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(
        parent: _fadeController,
        curve: Interval(begin, end, curve: Curves.easeOut),
      ),
    );
  }

  Animation<Offset> _slideInterval(double begin, double end) {
    return Tween<Offset>(begin: const Offset(0, 24), end: Offset.zero).animate(
      CurvedAnimation(
        parent: _fadeController,
        curve: Interval(begin, end, curve: Curves.easeOut),
      ),
    );
  }

  @override
  void dispose() {
    _fadeController.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        fit: StackFit.expand,
        children: [
          // ── Background gradient (simulating hero image overlay) ──
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Color(0xFF4A3528),
                  Color(0xFF3D2E24),
                  AppColors.darkGray,
                  AppColors.darkGray,
                ],
                stops: [0.0, 0.3, 0.65, 1.0],
              ),
            ),
          ),

          // ── Subtle radial warm glow ──
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: const Alignment(0.0, -0.3),
                  radius: 0.9,
                  colors: [
                    AppColors.ember.withValues(alpha: 0.15),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),

          // ── Content ──
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                children: [
                  const SizedBox(height: 48),

                  // Logo icon + "Est. 1924"
                  AnimatedBuilder(
                    animation: _fadeController,
                    builder:
                        (_, child) => Opacity(
                          opacity: _logoFade.value,
                          child: Transform.translate(
                            offset: _logoSlide.value,
                            child: child,
                          ),
                        ),
                    child: Column(
                      children: [
                        Container(
                          width: 56,
                          height: 56,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: AppColors.gold.withValues(alpha: 0.6),
                            ),
                          ),
                          child: const Icon(
                            Icons.account_balance,
                            color: AppColors.gold,
                            size: 28,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'EST. 1924',
                          style: AppTheme.ui(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 4,
                            color: AppColors.parchment.withValues(alpha: 0.6),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const Spacer(),

                  // Main title
                  AnimatedBuilder(
                    animation: _fadeController,
                    builder:
                        (_, child) => Opacity(
                          opacity: _titleFade.value,
                          child: Transform.translate(
                            offset: _titleSlide.value,
                            child: child,
                          ),
                        ),
                    child: Text(
                      'Heritage\nGallery',
                      textAlign: TextAlign.center,
                      style: AppTheme.display(
                        fontSize: 56,
                        fontWeight: FontWeight.w700,
                        height: 1.05,
                        color: AppColors.parchment,
                      ),
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Tagline
                  AnimatedBuilder(
                    animation: _fadeController,
                    builder:
                        (_, child) => Opacity(
                          opacity: _taglineFade.value,
                          child: Transform.translate(
                            offset: _taglineSlide.value,
                            child: child,
                          ),
                        ),
                    child: Text(
                      'Experience art through a lens of timeless luxury.',
                      textAlign: TextAlign.center,
                      style: AppTheme.ui(
                        fontSize: 16,
                        fontWeight: FontWeight.w300,
                        color: AppColors.white.withValues(alpha: 0.7),
                      ),
                    ),
                  ),

                  const Spacer(),

                  // CTA Button with pulsing glow
                  AnimatedBuilder(
                    animation: Listenable.merge([
                      _fadeController,
                      _pulseController,
                    ]),
                    builder:
                        (_, child) => Opacity(
                          opacity: _ctaFade.value,
                          child: Transform.translate(
                            offset: _ctaSlide.value,
                            child: child,
                          ),
                        ),
                    child: AnimatedBuilder(
                      animation: _pulseController,
                      builder:
                          (_, child) => Container(
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(100),
                              boxShadow: [
                                BoxShadow(
                                  color: AppColors.gold.withValues(
                                    alpha: 0.2 * _pulseAnimation.value,
                                  ),
                                  blurRadius: 24 * _pulseAnimation.value,
                                  spreadRadius: 4 * _pulseAnimation.value,
                                ),
                              ],
                            ),
                            child: child,
                          ),
                      child: SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed:
                              () => Navigator.pushNamed(context, '/validate'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.gold,
                            foregroundColor: AppColors.ink,
                            padding: const EdgeInsets.symmetric(vertical: 18),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(100),
                            ),
                            elevation: 0,
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                'Validate Your Ticket',
                                style: AppTheme.ui(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.ink,
                                ),
                              ),
                              const SizedBox(width: 8),
                              const Icon(Icons.arrow_forward, size: 16),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 40),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
