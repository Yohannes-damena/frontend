import 'package:flutter/material.dart';

/// Design-system color palette from the Heritage Gallery spec.
///
/// See design.md §5 — Color Palette for full reference.
class AppColors {
  AppColors._();

  // ── Core palette ──────────────────────────────────────────────────────

  /// Primary accent — interactive elements, CTAs, play buttons, progress bars.
  static const Color gold = Color(0xFFC08A2E);

  /// Secondary accent — active navigation, error states, brand emphasis.
  static const Color deepRed = Color(0xFF7F1425);

  /// Tertiary — inactive/upcoming card backgrounds, warm depth layers.
  static const Color ember = Color(0xFF8C3B3B);

  /// Primary background — screen backgrounds, footer base, dark surfaces.
  static const Color darkGray = Color(0xFF383838);

  /// Primary surface — active cards, main titles, high-contrast surfaces.
  static const Color parchment = Color(0xFFF0E6D2);

  /// Text on dark, inactive icons, high-contrast elements.
  static const Color white = Color(0xFFFFFFFF);

  /// Dark text on light surfaces — card body, button labels on gold.
  static const Color ink = Color(0xFF383838);

  // ── Derived / extended palette ────────────────────────────────────────

  /// Subtle dark card / panel background.
  static const Color panelDark = Color(0xFF2B2B2B);

  /// Gold glow at 20 % opacity (button glow, focus rings).
  static Color goldGlow = gold.withValues(alpha: 0.20);

  /// Dark overlay at 80 % opacity (image overlays, modal backdrops).
  static Color darkOverlay = darkGray.withValues(alpha: 0.80);

  /// Parchment at 60 % opacity (disabled text, placeholders).
  static Color parchmentMuted = parchment.withValues(alpha: 0.60);

  /// Ember at 10 % opacity (background tints, hover states).
  static Color emberSubtle = ember.withValues(alpha: 0.10);
}
