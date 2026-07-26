import 'package:flutter/material.dart';

import '../l10n/app_strings.dart';
import '../screens/stitch_export/stitch_routes.dart';
import '../screens/stitch_export/stitch_theme.dart';

/// Gear action that opens Settings from any top app bar.
class SettingsIconButton extends StatelessWidget {
  const SettingsIconButton({super.key, this.color = StitchTheme.parchment});

  final Color color;

  @override
  Widget build(BuildContext context) {
    final AppStrings s = AppStrings.of(context);
    return IconButton(
      tooltip: s.settings,
      onPressed: () {
        Navigator.pushNamed(context, StitchRoutes.settings);
      },
      icon: Icon(Icons.settings_outlined, color: color),
    );
  }
}
