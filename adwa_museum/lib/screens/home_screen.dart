import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme.dart';
import '../widgets/active_card.dart';
import '../widgets/inactive_card.dart';
import '../widgets/footer_nav.dart';

/// Main hub screen — featured exhibition + upcoming queue.
///
/// Converted from home.tsx. Shows a "Welcome back" greeting, featured
/// exhibition active card with play button, and "Up next" inactive cards.
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key, required this.onNavTap});

  /// Called when a footer nav tab is tapped.
  final ValueChanged<int> onNavTap;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.darkGray,
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.only(bottom: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SafeArea(
                    bottom: false,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 24,
                        vertical: 16,
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          // Avatar
                          Container(
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: Colors.black.withValues(alpha: 0.4),
                              border: Border.all(
                                color: AppColors.parchment.withValues(
                                  alpha: 0.2,
                                ),
                              ),
                            ),
                          ),
                          Text(
                            'THE GALLERY',
                            style: AppTheme.display(
                              fontSize: 14,
                              fontWeight: FontWeight.w400,
                              letterSpacing: 4,
                            ),
                          ),
                          const SizedBox(width: 36),
                        ],
                      ),
                    ),
                  ),

                  // Greeting
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'WELCOME BACK',
                          style: AppTheme.overline(color: AppColors.gold),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          "Today's Journey",
                          style: AppTheme.display(
                            fontSize: 36,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Featured card
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: ActiveCard(
                      tag: 'Featured Exhibition',
                      title: 'Light of the Renaissance',
                      body:
                          'A curated journey through the pivotal masterworks of the 15th century.',
                      trailing: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              // Play button
                              Container(
                                width: 36,
                                height: 36,
                                decoration: const BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: AppColors.gold,
                                ),
                                child: const Icon(
                                  Icons.play_arrow,
                                  color: AppColors.white,
                                  size: 16,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'BEGIN TOUR',
                                style: AppTheme.ui(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  letterSpacing: 2,
                                  color: AppColors.ink.withValues(alpha: 0.7),
                                ),
                              ),
                            ],
                          ),
                          Text(
                            '01 / 12',
                            style: AppTheme.display(
                              fontSize: 18,
                              color: AppColors.ink.withValues(alpha: 0.4),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 24),

                  // "Up next" section
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'UP NEXT',
                          style: AppTheme.ui(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 3,
                            color: AppColors.parchment.withValues(alpha: 0.6),
                          ),
                        ),
                        const SizedBox(height: 12),
                        const InactiveCard(
                          title: 'Modern Voices',
                          body:
                              'Contemporary works from twelve living artists.',
                        ),
                        const SizedBox(height: 12),
                        const InactiveCard(
                          title: 'Sculpture Court',
                          body: 'Marble and bronze from the classical period.',
                        ),
                        const SizedBox(height: 12),
                        const InactiveCard(
                          title: 'The Gilded Room',
                          body: 'Decorative arts from the Belle Époque.',
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Footer
          FooterNav(currentIndex: 0, onTap: onNavTap),
        ],
      ),
    );
  }
}
