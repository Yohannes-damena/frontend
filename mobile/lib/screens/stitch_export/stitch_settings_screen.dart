import 'package:flutter/material.dart';

import '../../l10n/app_strings.dart';
import '../../services/api_service.dart';
import '../../services/locale_controller.dart';
import 'stitch_routes.dart';
import 'stitch_theme.dart';

/// Settings — language toggle for static UI chrome (EN / አማርኛ).
///
/// Long-press the title when [ApiService.enableDebugTools] is true to open the
/// debug QR screen. That gesture is not registered in release builds.
class StitchSettingsScreen extends StatelessWidget {
  const StitchSettingsScreen({super.key});

  void _openDebugQrIfMock(BuildContext context) {
    if (!ApiService.enableDebugTools) {
      return;
    }
    Navigator.pushNamed(context, StitchRoutes.debugQr);
  }

  @override
  Widget build(BuildContext context) {
    final LocaleController localeController = LocaleController.instance;

    return Scaffold(
      backgroundColor: StitchTheme.darkText,
      appBar: AppBar(
        backgroundColor: StitchTheme.darkText,
        foregroundColor: StitchTheme.ink,
        title: ListenableBuilder(
          listenable: localeController,
          builder: (BuildContext context, _) {
            final Widget title = Text(
              AppStrings.fromLocale(localeController.locale).settings,
              style: StitchTheme.headline(
                size: 22,
                color: StitchTheme.parchment,
              ),
            );
            if (!ApiService.enableDebugTools) {
              return title;
            }
            return GestureDetector(
              onLongPress: () => _openDebugQrIfMock(context),
              child: title,
            );
          },
        ),
      ),
      body: ListenableBuilder(
        listenable: localeController,
        builder: (BuildContext context, _) {
          final AppStrings live =
              AppStrings.fromLocale(localeController.locale);
          final String code = localeController.locale.languageCode;

          return ListView(
            padding: const EdgeInsets.fromLTRB(24, 12, 24, 32),
            children: <Widget>[
              Text(
                live.language.toUpperCase(),
                style: StitchTheme.overline(size: 12, color: StitchTheme.muted),
              ),
              const SizedBox(height: 8),
              Text(
                live.languageHint,
                style: StitchTheme.body(
                  size: 15,
                  color: StitchTheme.muted,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 20),
              Container(
                decoration: BoxDecoration(
                  color: StitchTheme.panel,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  children: <Widget>[
                    ListTile(
                      title: Text(
                        live.english,
                        style: StitchTheme.body(
                          size: 16,
                          weight: FontWeight.w600,
                          color: StitchTheme.parchment,
                        ),
                      ),
                      trailing: Icon(
                        code == 'en'
                            ? Icons.check_circle
                            : Icons.circle_outlined,
                        color:
                            code == 'en'
                                ? StitchTheme.adwaGold
                                : StitchTheme.muted,
                      ),
                      onTap: () =>
                          localeController.setLocale(const Locale('en')),
                    ),
                    Divider(
                      height: 1,
                      color: StitchTheme.muted.withValues(alpha: 0.2),
                    ),
                    ListTile(
                      title: Text(
                        live.amharic,
                        style: StitchTheme.body(
                          size: 16,
                          weight: FontWeight.w600,
                          color: StitchTheme.parchment,
                        ),
                      ),
                      trailing: Icon(
                        code == 'am'
                            ? Icons.check_circle
                            : Icons.circle_outlined,
                        color:
                            code == 'am'
                                ? StitchTheme.adwaGold
                                : StitchTheme.muted,
                      ),
                      onTap: () =>
                          localeController.setLocale(const Locale('am')),
                    ),
                  ],
                ),
              ),
              if (ApiService.enableDebugTools) ...<Widget>[
                const SizedBox(height: 28),
                Text(
                  'DEBUG',
                  style: StitchTheme.overline(
                    size: 11,
                    color: StitchTheme.muted,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Long-press “Settings” in the app bar to open mock QR codes.',
                  style: StitchTheme.body(
                    size: 13,
                    color: StitchTheme.muted.withValues(alpha: 0.85),
                    height: 1.4,
                  ),
                ),
              ],
            ],
          );
        },
      ),
    );
  }
}
