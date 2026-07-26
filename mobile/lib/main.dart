import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'models/chat_args.dart';
import 'models/item_detail_args.dart';
import 'models/room.dart';
import 'models/ticket_validation_args.dart';
import 'screens/stitch_export/stitch_app_shell.dart';
import 'screens/stitch_export/stitch_chat_screen.dart';
import 'screens/stitch_export/stitch_debug_qr_screen.dart';
import 'screens/stitch_export/stitch_item_detail_screen.dart';
import 'screens/stitch_export/stitch_room_screen.dart';
import 'screens/stitch_export/stitch_routes.dart';
import 'screens/stitch_export/stitch_settings_screen.dart';
import 'screens/stitch_export/stitch_ticket_validation_screen.dart';
import 'screens/stitch_export/stitch_theme.dart';
import 'screens/stitch_export/stitch_welcome_screen.dart';
import 'services/api_service.dart';
import 'services/locale_controller.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await LocaleController.instance.load();

  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      statusBarBrightness: Brightness.light,
    ),
  );

  runApp(const MuseumGuideApp());
}

class MuseumGuideApp extends StatelessWidget {
  const MuseumGuideApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: LocaleController.instance,
      builder: (BuildContext context, _) {
        final Locale locale = LocaleController.instance.locale;
        return MaterialApp(
          title: 'Museum Guide',
          debugShowCheckedModeBanner: false,
          locale: locale,
          supportedLocales: const <Locale>[
            Locale('en'),
            Locale('am'),
          ],
          // Our own strings come from AppStrings, but Material's built-in
          // widgets still need localizations of their own, and the framework
          // asserts rather than falling back when a declared locale has none.
          localizationsDelegates: const <LocalizationsDelegate<Object>>[
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          localeResolutionCallback: (Locale? device, Iterable<Locale> supported) {
            for (final Locale candidate in supported) {
              if (candidate.languageCode == locale.languageCode) {
                return locale;
              }
            }
            return const Locale('en');
          },
          theme: ThemeData(
            useMaterial3: true,
            brightness: Brightness.light,
            scaffoldBackgroundColor: StitchTheme.darkText,
            colorScheme: ColorScheme.fromSeed(
              seedColor: StitchTheme.adwaGold,
              brightness: Brightness.light,
              surface: StitchTheme.panel,
            ),
            appBarTheme: const AppBarTheme(
              backgroundColor: StitchTheme.darkText,
              foregroundColor: StitchTheme.ink,
              surfaceTintColor: Colors.transparent,
            ),
            snackBarTheme: const SnackBarThemeData(
              backgroundColor: StitchTheme.ink,
              contentTextStyle: TextStyle(color: StitchTheme.heroText),
              behavior: SnackBarBehavior.floating,
            ),
          ),
          initialRoute: StitchRoutes.welcome,
          onGenerateRoute: _onGenerateRoute,
        );
      },
    );
  }

  static Route<dynamic> _onGenerateRoute(RouteSettings settings) {
    switch (settings.name) {
      case StitchRoutes.welcome:
        return MaterialPageRoute<void>(
          settings: settings,
          builder: (_) => const StitchWelcomeScreen(),
        );
      case StitchRoutes.validate:
        final TicketValidationArgs? ticketArgs =
            StitchRoutes.ticketArgsFrom(settings.arguments);
        if (ticketArgs == null) {
          return MaterialPageRoute<void>(
            settings: settings,
            builder: (_) => const StitchWelcomeScreen(),
          );
        }
        return MaterialPageRoute<bool>(
          settings: settings,
          builder: (_) => StitchTicketValidationScreen(args: ticketArgs),
        );
      case StitchRoutes.home:
        final int initialIndex =
            settings.arguments is int ? settings.arguments! as int : 0;
        return MaterialPageRoute<void>(
          settings: settings,
          builder: (_) => StitchAppShell(initialIndex: initialIndex),
        );
      case StitchRoutes.room:
        final Room? room = StitchRoutes.roomFromArgs(settings.arguments);
        if (room == null) {
          return MaterialPageRoute<void>(
            settings: settings,
            builder: (_) => const StitchWelcomeScreen(),
          );
        }
        return MaterialPageRoute<void>(
          settings: settings,
          builder: (_) => StitchRoomScreen(room: room),
        );
      case StitchRoutes.item:
        final ItemDetailArgs? args = StitchRoutes.itemArgsFrom(
          settings.arguments,
        );
        if (args == null) {
          return MaterialPageRoute<void>(
            settings: settings,
            builder: (_) => const StitchWelcomeScreen(),
          );
        }
        return MaterialPageRoute<void>(
          settings: settings,
          builder: (_) => StitchItemDetailScreen.fromArgs(args),
        );
      case StitchRoutes.chat:
        final ChatArgs? args = StitchRoutes.chatArgsFrom(settings.arguments);
        if (args == null || args.waypointId.isEmpty) {
          return MaterialPageRoute<void>(
            settings: settings,
            builder: (_) => const StitchWelcomeScreen(),
          );
        }
        return MaterialPageRoute<void>(
          settings: settings,
          builder: (_) => StitchChatScreen(args: args),
        );
      case StitchRoutes.settings:
        return MaterialPageRoute<void>(
          settings: settings,
          builder: (_) => const StitchSettingsScreen(),
        );
      case StitchRoutes.debugQr:
        // Completely unreachable in release builds.
        if (!ApiService.enableDebugTools) {
          return MaterialPageRoute<void>(
            settings: settings,
            builder: (_) => const StitchWelcomeScreen(),
          );
        }
        return MaterialPageRoute<void>(
          settings: settings,
          builder: (_) => const StitchDebugQrScreen(),
        );
      default:
        return MaterialPageRoute<void>(
          settings: settings,
          builder: (_) => const StitchWelcomeScreen(),
        );
    }
  }
}
