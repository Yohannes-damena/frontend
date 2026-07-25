import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

/// Builds the app-wide [ThemeData] that mirrors the Heritage Gallery design
/// system (see design.md §4 Typography, §5 Colors).
class AppTheme {
  AppTheme._();

  static ThemeData get dark {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: AppColors.darkGray,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.gold,
        secondary: AppColors.deepRed,
        surface: AppColors.darkGray,
        error: AppColors.deepRed,
        onPrimary: AppColors.ink,
        onSecondary: AppColors.parchment,
        onSurface: AppColors.parchment,
        onError: AppColors.white,
      ),
      textTheme: _textTheme,
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: AppColors.panelDark,
        selectedItemColor: AppColors.gold,
        unselectedItemColor: AppColors.parchment,
      ),
    );
  }

  // ── Text theme ────────────────────────────────────────────────────────

  static TextTheme get _textTheme {
    // Cormorant for display / headings
    final cormorant = GoogleFonts.cormorantTextTheme();
    // Open Sans for UI / body
    final openSans = GoogleFonts.openSansTextTheme();

    return TextTheme(
      // heading-hero: Cormorant Bold 36pt
      displayLarge: cormorant.displayLarge!.copyWith(
        fontSize: 36,
        fontWeight: FontWeight.w700,
        height: 1.2,
        letterSpacing: -0.5,
        color: AppColors.parchment,
      ),
      // heading-screen: Cormorant SemiBold 28pt
      displayMedium: cormorant.displayMedium!.copyWith(
        fontSize: 28,
        fontWeight: FontWeight.w600,
        height: 1.25,
        letterSpacing: -0.3,
        color: AppColors.parchment,
      ),
      // heading-section: Cormorant SemiBold 22pt
      displaySmall: cormorant.displaySmall!.copyWith(
        fontSize: 22,
        fontWeight: FontWeight.w600,
        height: 1.3,
        color: AppColors.parchment,
      ),
      // heading-card: Cormorant Regular 18pt
      headlineMedium: cormorant.headlineMedium!.copyWith(
        fontSize: 18,
        fontWeight: FontWeight.w400,
        height: 1.35,
        color: AppColors.parchment,
      ),
      // body-primary: Open Sans Regular 16pt
      bodyLarge: openSans.bodyLarge!.copyWith(
        fontSize: 16,
        fontWeight: FontWeight.w400,
        height: 1.5,
        color: AppColors.parchment,
      ),
      // body-secondary: Open Sans Regular 14pt
      bodyMedium: openSans.bodyMedium!.copyWith(
        fontSize: 14,
        fontWeight: FontWeight.w400,
        height: 1.45,
        color: AppColors.parchment,
      ),
      // label-button: Open Sans SemiBold 16pt
      labelLarge: openSans.labelLarge!.copyWith(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        height: 1.0,
        letterSpacing: 0.5,
        color: AppColors.ink,
      ),
      // label-caption: Open Sans Light 13pt
      bodySmall: openSans.bodySmall!.copyWith(
        fontSize: 13,
        fontWeight: FontWeight.w300,
        height: 1.4,
        letterSpacing: 0.2,
        color: AppColors.parchment,
      ),
      // label-footer: Open Sans Medium 11pt
      labelSmall: openSans.labelSmall!.copyWith(
        fontSize: 11,
        fontWeight: FontWeight.w500,
        height: 1.0,
        letterSpacing: 0.3,
        color: AppColors.parchment,
      ),
    );
  }

  // ── Convenience text-style helpers ────────────────────────────────────

  /// Cormorant display style at any size.
  static TextStyle display({
    double fontSize = 28,
    FontWeight fontWeight = FontWeight.w600,
    Color color = AppColors.parchment,
    double? letterSpacing,
    double? height,
  }) {
    return GoogleFonts.cormorant(
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color,
      letterSpacing: letterSpacing,
      height: height,
    );
  }

  /// Open Sans UI style at any size.
  static TextStyle ui({
    double fontSize = 14,
    FontWeight fontWeight = FontWeight.w400,
    Color color = AppColors.parchment,
    double? letterSpacing,
    double? height,
  }) {
    return GoogleFonts.openSans(
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color,
      letterSpacing: letterSpacing,
      height: height,
    );
  }

  /// Overline / label style (uppercase expected by caller).
  static TextStyle overline({
    double fontSize = 10,
    FontWeight fontWeight = FontWeight.w600,
    Color color = AppColors.gold,
    double letterSpacing = 3.0,
  }) {
    return GoogleFonts.openSans(
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color,
      letterSpacing: letterSpacing,
    );
  }
}
