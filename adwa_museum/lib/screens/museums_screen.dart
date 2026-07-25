import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme.dart';
import '../widgets/footer_nav.dart';

/// Browse partner museums screen.
///
/// Converted from museums.tsx. Shows a search bar and a list of museum
/// cards — the first card is "active" (Parchment bg), the rest are
/// "inactive" (Ember bg).
class MuseumsScreen extends StatelessWidget {
  const MuseumsScreen({super.key, required this.onNavTap});

  final ValueChanged<int> onNavTap;

  static const _museums = [
    _Museum(
      id: 'heritage',
      name: 'Heritage Gallery',
      city: 'Rome',
      tag: 'Featured',
      pieces: 412,
    ),
    _Museum(
      id: 'palazzo',
      name: 'Palazzo della Luce',
      city: 'Florence',
      tag: 'New',
      pieces: 218,
    ),
    _Museum(
      id: 'antiquities',
      name: 'Museum of Antiquities',
      city: 'Naples',
      tag: 'Classic',
      pieces: 604,
    ),
    _Museum(
      id: 'linea',
      name: 'Linea Contemporary',
      city: 'Milan',
      tag: 'Modern',
      pieces: 96,
    ),
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
                  ScreenHeader(title: 'Browse', onBack: () => onNavTap(0)),

                  const SizedBox(height: 24),

                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Partner Museums',
                          style: AppTheme.display(
                            fontSize: 28,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Included with your All-Access Pass.',
                          style: AppTheme.ui(
                            fontSize: 14,
                            color: AppColors.parchment.withValues(alpha: 0.6),
                          ),
                        ),

                        const SizedBox(height: 20),

                        // Search bar
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 12,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.white.withValues(alpha: 0.05),
                            borderRadius: BorderRadius.circular(100),
                            border: Border.all(
                              color: AppColors.white.withValues(alpha: 0.1),
                            ),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                Icons.search,
                                size: 16,
                                color: AppColors.parchment.withValues(
                                  alpha: 0.5,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: TextField(
                                  style: AppTheme.ui(
                                    fontSize: 14,
                                    color: AppColors.parchment,
                                  ),
                                  decoration: InputDecoration(
                                    isDense: true,
                                    contentPadding: EdgeInsets.zero,
                                    border: InputBorder.none,
                                    hintText: 'Search museums or cities',
                                    hintStyle: AppTheme.ui(
                                      fontSize: 14,
                                      color: AppColors.parchment.withValues(
                                        alpha: 0.4,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Museum cards
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Column(
                      children: List.generate(_museums.length, (i) {
                        final m = _museums[i];
                        final isActive = i == 0;
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 16),
                          child: _MuseumCard(museum: m, isActive: isActive),
                        );
                      }),
                    ),
                  ),

                  const SizedBox(height: 16),
                ],
              ),
            ),
          ),
          FooterNav(currentIndex: 3, onTap: onNavTap),
        ],
      ),
    );
  }
}

// ── Museum card ─────────────────────────────────────────────────────────

class _MuseumCard extends StatelessWidget {
  const _MuseumCard({required this.museum, required this.isActive});
  final _Museum museum;
  final bool isActive;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color:
            isActive
                ? AppColors.parchment
                : AppColors.ember.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.25),
            blurRadius: 30,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  museum.tag.toUpperCase(),
                  style: AppTheme.overline(
                    color:
                        isActive
                            ? AppColors.gold
                            : AppColors.parchment.withValues(alpha: 0.6),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  museum.name,
                  style: AppTheme.display(
                    fontSize: 22,
                    fontWeight: FontWeight.w600,
                    color: isActive ? AppColors.ink : AppColors.parchment,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${museum.city} · ${museum.pieces} works',
                  style: AppTheme.ui(
                    fontSize: 14,
                    color:
                        isActive
                            ? AppColors.ink.withValues(alpha: 0.7)
                            : AppColors.parchment.withValues(alpha: 0.7),
                  ),
                ),
              ],
            ),
          ),
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color:
                  isActive
                      ? AppColors.gold
                      : AppColors.parchment.withValues(alpha: 0.1),
            ),
            child: Icon(
              Icons.chevron_right,
              size: 16,
              color: isActive ? AppColors.white : AppColors.parchment,
            ),
          ),
        ],
      ),
    );
  }
}

// ── Data model ──────────────────────────────────────────────────────────

class _Museum {
  final String id;
  final String name;
  final String city;
  final String tag;
  final int pieces;
  const _Museum({
    required this.id,
    required this.name,
    required this.city,
    required this.tag,
    required this.pieces,
  });
}
