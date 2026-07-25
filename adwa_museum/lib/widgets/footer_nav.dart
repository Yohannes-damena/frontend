import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme.dart';

/// Persistent bottom navigation bar matching the Heritage Gallery footer spec.
///
/// Five tabs: Home, Map, Scan (primary/elevated), Browse, Profile.
/// The "Scan" tab is visually elevated with a gold floating action circle.
class FooterNav extends StatelessWidget {
  const FooterNav({super.key, required this.currentIndex, required this.onTap});

  /// Currently selected tab index (0-4).
  final int currentIndex;

  /// Called when a tab is tapped with the new index.
  final ValueChanged<int> onTap;

  static const _labels = ['Home', 'Map', 'Scan', 'Browse', 'Profile'];

  static const _icons = [
    _FooterIcon.home,
    _FooterIcon.map,
    _FooterIcon.scan,
    _FooterIcon.browse,
    _FooterIcon.profile,
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.panelDark.withValues(alpha: 0.95),
        border: Border(
          top: BorderSide(color: AppColors.white.withValues(alpha: 0.05)),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: List.generate(5, (i) {
              final active = i == currentIndex;
              // Primary (Scan) tab — elevated gold circle
              if (i == 2) {
                return _PrimaryScanTab(active: active, onTap: () => onTap(i));
              }
              return _NavTab(
                icon: _icons[i],
                label: _labels[i],
                active: active,
                onTap: () => onTap(i),
              );
            }),
          ),
        ),
      ),
    );
  }
}

// ── Individual tab ──────────────────────────────────────────────────────

class _NavTab extends StatelessWidget {
  const _NavTab({
    required this.icon,
    required this.label,
    required this.active,
    required this.onTap,
  });

  final Widget Function(bool active) icon;
  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: SizedBox(
        width: 56,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 200),
              child: icon(active),
            ),
            const SizedBox(height: 4),
            Text(
              label.toUpperCase(),
              style: AppTheme.ui(
                fontSize: 9,
                fontWeight: FontWeight.w500,
                letterSpacing: 1.5,
                color:
                    active
                        ? AppColors.gold
                        : AppColors.parchment.withValues(alpha: 0.7),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Elevated "Scan" tab ─────────────────────────────────────────────────

class _PrimaryScanTab extends StatelessWidget {
  const _PrimaryScanTab({required this.active, required this.onTap});

  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Transform.translate(
            offset: const Offset(0, -16),
            child: Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: AppColors.gold,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: AppColors.gold.withValues(alpha: 0.5),
                    blurRadius: 16,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: const Icon(
                Icons.qr_code_scanner_rounded,
                color: AppColors.ink,
                size: 24,
              ),
            ),
          ),
          Transform.translate(
            offset: const Offset(0, -12),
            child: Text(
              'SCAN',
              style: AppTheme.ui(
                fontSize: 9,
                fontWeight: FontWeight.w500,
                letterSpacing: 1.5,
                color: AppColors.parchment.withValues(alpha: 0.7),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Footer icon builders ────────────────────────────────────────────────

class _FooterIcon {
  static Widget home(bool active) => Icon(
    Icons.home_outlined,
    key: ValueKey('home_$active'),
    size: 24,
    color: active ? AppColors.gold : AppColors.parchment.withValues(alpha: 0.7),
  );

  static Widget map(bool active) => Icon(
    Icons.location_on_outlined,
    key: ValueKey('map_$active'),
    size: 24,
    color: active ? AppColors.gold : AppColors.parchment.withValues(alpha: 0.7),
  );

  static Widget scan(bool active) => Icon(
    Icons.qr_code_scanner_rounded,
    key: ValueKey('scan_$active'),
    size: 24,
    color: active ? AppColors.gold : AppColors.parchment.withValues(alpha: 0.7),
  );

  static Widget browse(bool active) => Icon(
    Icons.museum_outlined,
    key: ValueKey('browse_$active'),
    size: 24,
    color: active ? AppColors.gold : AppColors.parchment.withValues(alpha: 0.7),
  );

  static Widget profile(bool active) => Icon(
    Icons.person_outline,
    key: ValueKey('profile_$active'),
    size: 24,
    color: active ? AppColors.gold : AppColors.parchment.withValues(alpha: 0.7),
  );
}

// ── Reusable screen header ──────────────────────────────────────────────

/// Standard screen header with optional back button and right action.
///
/// Mirrors the `ScreenHeader` component from FooterNav.tsx.
class ScreenHeader extends StatelessWidget {
  const ScreenHeader({super.key, required this.title, this.onBack, this.right});

  final String title;
  final VoidCallback? onBack;
  final Widget? right;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            // Back button
            if (onBack != null)
              _CircleButton(
                onTap: onBack!,
                child: const Icon(
                  Icons.chevron_left,
                  size: 18,
                  color: AppColors.parchment,
                ),
              )
            else
              const SizedBox(width: 36, height: 36),

            // Title
            Text(
              title.toUpperCase(),
              style: AppTheme.display(
                fontSize: 14,
                fontWeight: FontWeight.w400,
                color: AppColors.parchment.withValues(alpha: 0.8),
                letterSpacing: 4,
              ),
            ),

            // Right action
            if (right != null)
              right!
            else
              const SizedBox(width: 36, height: 36),
          ],
        ),
      ),
    );
  }
}

class _CircleButton extends StatelessWidget {
  const _CircleButton({required this.onTap, required this.child});
  final VoidCallback onTap;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: AppColors.parchment.withValues(alpha: 0.2)),
        ),
        alignment: Alignment.center,
        child: child,
      ),
    );
  }
}
