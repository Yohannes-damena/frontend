import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme.dart';
import '../widgets/footer_nav.dart';

/// Profile screen — ticket info, visit history, and saved works.
///
/// Converted from profile.tsx. Shows an All-Access Pass card, visit
/// history entries, saved works list, and an "End Session" button.
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key, required this.onNavTap});

  final ValueChanged<int> onNavTap;

  static const _visits = [
    _Visit(museum: 'Heritage Gallery', date: 'Oct 24, 2024', stops: '12 / 12'),
    _Visit(museum: 'Palazzo della Luce', date: 'Aug 03, 2024', stops: '8 / 14'),
    _Visit(
      museum: 'Museum of Antiquities',
      date: 'May 17, 2024',
      stops: '6 / 9',
    ),
  ];

  static const _saved = [
    'Study of Hands, 1487',
    'The Ivory Casket',
    'Portrait in Umber',
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
                  ScreenHeader(title: 'Profile', onBack: () => onNavTap(0)),

                  const SizedBox(height: 32),

                  // ── All-Access Pass card ──
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: AppColors.parchment,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: const [
                          BoxShadow(
                            color: Color(0x59000000),
                            blurRadius: 50,
                            offset: Offset(0, 20),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'ALL-ACCESS PASS',
                            style: AppTheme.overline(color: AppColors.gold),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Visitor #HM-9824-AX',
                            style: AppTheme.display(
                              fontSize: 28,
                              fontWeight: FontWeight.w600,
                              color: AppColors.ink,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Valid through October 24, 2024',
                            style: AppTheme.ui(
                              fontSize: 14,
                              color: AppColors.ink.withValues(alpha: 0.7),
                            ),
                          ),
                          const SizedBox(height: 20),
                          Container(
                            padding: const EdgeInsets.only(top: 16),
                            decoration: BoxDecoration(
                              border: Border(
                                top: BorderSide(
                                  color: AppColors.ink.withValues(alpha: 0.1),
                                ),
                              ),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                _StatColumn(
                                  label: 'Stops visited',
                                  value: '26',
                                ),
                                _StatColumn(label: 'Museums', value: '3'),
                                _StatColumn(
                                  label: 'Saved',
                                  value: '${_saved.length}',
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 32),

                  // ── Visit history ──
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'VISIT HISTORY',
                          style: AppTheme.ui(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 3,
                            color: AppColors.parchment.withValues(alpha: 0.6),
                          ),
                        ),
                        const SizedBox(height: 12),
                        ..._visits.map(
                          (v) => Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: AppColors.ember.withValues(alpha: 0.6),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    crossAxisAlignment:
                                        CrossAxisAlignment.baseline,
                                    textBaseline: TextBaseline.alphabetic,
                                    children: [
                                      Expanded(
                                        child: Text(
                                          v.museum,
                                          style: AppTheme.display(
                                            fontSize: 18,
                                            color: AppColors.parchment,
                                          ),
                                        ),
                                      ),
                                      Text(
                                        v.date.toUpperCase(),
                                        style: AppTheme.ui(
                                          fontSize: 11,
                                          letterSpacing: 2,
                                          color: AppColors.parchment.withValues(
                                            alpha: 0.6,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Completed ${v.stops} stops',
                                    style: AppTheme.ui(
                                      fontSize: 12,
                                      color: AppColors.parchment.withValues(
                                        alpha: 0.7,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 8),

                  // ── Saved works ──
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'SAVED WORKS',
                          style: AppTheme.ui(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 3,
                            color: AppColors.parchment.withValues(alpha: 0.6),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Container(
                          decoration: BoxDecoration(
                            color: AppColors.white.withValues(alpha: 0.05),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Column(
                            children:
                                _saved.asMap().entries.map((entry) {
                                  final isLast = entry.key == _saved.length - 1;
                                  return Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 16,
                                      vertical: 14,
                                    ),
                                    decoration: BoxDecoration(
                                      border:
                                          isLast
                                              ? null
                                              : Border(
                                                bottom: BorderSide(
                                                  color: AppColors.white
                                                      .withValues(alpha: 0.05),
                                                ),
                                              ),
                                    ),
                                    child: Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(
                                          entry.value,
                                          style: AppTheme.display(
                                            fontSize: 16,
                                            fontWeight: FontWeight.w400,
                                          ),
                                        ),
                                        const Icon(
                                          Icons.chevron_right,
                                          size: 16,
                                          color: AppColors.gold,
                                        ),
                                      ],
                                    ),
                                  );
                                }).toList(),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 32),

                  // ── End Session ──
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: SizedBox(
                      width: double.infinity,
                      child: OutlinedButton(
                        onPressed:
                            () => Navigator.pushNamedAndRemoveUntil(
                              context,
                              '/',
                              (_) => false,
                            ),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          side: BorderSide(
                            color: AppColors.white.withValues(alpha: 0.1),
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(100),
                          ),
                        ),
                        child: Text(
                          'END SESSION',
                          style: AppTheme.ui(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 3,
                            color: AppColors.parchment.withValues(alpha: 0.7),
                          ),
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
          FooterNav(currentIndex: 4, onTap: onNavTap),
        ],
      ),
    );
  }
}

// ── Stat column widget ──────────────────────────────────────────────────

class _StatColumn extends StatelessWidget {
  const _StatColumn({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: AppTheme.ui(
            fontSize: 10,
            letterSpacing: 2.5,
            color: AppColors.ink.withValues(alpha: 0.5),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: AppTheme.display(fontSize: 20, color: AppColors.ink),
        ),
      ],
    );
  }
}

// ── Data model ──────────────────────────────────────────────────────────

class _Visit {
  final String museum;
  final String date;
  final String stops;
  const _Visit({required this.museum, required this.date, required this.stops});
}
