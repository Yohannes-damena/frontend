import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme.dart';

/// Design-system "Active Card" — Parchment background, gold accents.
///
/// Used for featured / current content (see design.md §7 Card System).
class ActiveCard extends StatelessWidget {
  const ActiveCard({
    super.key,
    required this.tag,
    required this.title,
    required this.body,
    this.trailing,
    this.onTap,
  });

  final String tag;
  final String title;
  final String body;
  final Widget? trailing;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: AppColors.parchment,
          borderRadius: BorderRadius.circular(16),
          boxShadow: const [
            BoxShadow(
              color: Color(0x40000000),
              blurRadius: 24,
              offset: Offset(0, 8),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              tag.toUpperCase(),
              style: AppTheme.overline(color: AppColors.gold),
            ),
            const SizedBox(height: 12),
            Text(
              title,
              style: AppTheme.display(
                fontSize: 22,
                fontWeight: FontWeight.w600,
                color: AppColors.ink,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              body,
              style: AppTheme.ui(
                fontSize: 14,
                color: AppColors.ink.withValues(alpha: 0.7),
              ),
            ),
            if (trailing != null) ...[const SizedBox(height: 20), trailing!],
          ],
        ),
      ),
    );
  }
}
