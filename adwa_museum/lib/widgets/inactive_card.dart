import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme.dart';

/// Design-system "Inactive Card" — Ember background, scaled down.
///
/// Used for upcoming / queued content (see design.md §7 Card System).
class InactiveCard extends StatelessWidget {
  const InactiveCard({
    super.key,
    required this.title,
    required this.body,
    this.onTap,
  });

  final String title;
  final String body;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Transform.scale(
        scale: 0.95,
        alignment: Alignment.centerLeft,
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.ember.withValues(alpha: 0.7),
            borderRadius: BorderRadius.circular(12),
            boxShadow: const [
              BoxShadow(
                color: Color(0x26000000),
                blurRadius: 12,
                offset: Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: AppTheme.display(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: AppColors.parchment,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                body,
                style: AppTheme.ui(
                  fontSize: 13,
                  color: AppColors.parchment.withValues(alpha: 0.7),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
