import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'theme/app_theme.dart';
import 'screens/welcome_screen.dart';
import 'screens/validate_screen.dart';
import 'screens/affirmation_screen.dart';
import 'screens/home_screen.dart';
import 'screens/map_screen.dart';
import 'screens/museums_screen.dart';
import 'screens/profile_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // Lock orientation to portrait (museum app — mobile-first).
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // Transparent status bar to blend with dark backgrounds.
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
    ),
  );

  runApp(const AdwaMuseumApp());
}

/// Root application widget
class AdwaMuseumApp extends StatelessWidget {
  const AdwaMuseumApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Heritage Gallery',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.dark,

      // Named routes matching the original React flow.
      initialRoute: '/',
      routes: {
        '/': (_) => const WelcomeScreen(),
        '/validate': (_) => const ValidateScreen(),
        '/affirmation': (_) => const AffirmationScreen(),
      },

      // The bottom-nav shell screens use a shared IndexedStack so
      // that the footer remains persistent across tabs.
      onGenerateRoute: (settings) {
        if (settings.name == '/home') {
          return _fadeRoute(const _MainShell(initialIndex: 0));
        }
        if (settings.name == '/map') {
          return _fadeRoute(const _MainShell(initialIndex: 1));
        }
        if (settings.name == '/museums') {
          return _fadeRoute(const _MainShell(initialIndex: 3));
        }
        if (settings.name == '/profile') {
          return _fadeRoute(const _MainShell(initialIndex: 4));
        }
        return null;
      },
    );
  }

  static Route<dynamic> _fadeRoute(Widget page) {
    return PageRouteBuilder(
      pageBuilder: (_, __, ___) => page,
      transitionsBuilder: (_, animation, __, child) {
        return FadeTransition(opacity: animation, child: child);
      },
      transitionDuration: const Duration(milliseconds: 350),
    );
  }
}

/// Main navigation shell — houses the tab screens with a persistent footer.
///
/// Uses [IndexedStack] so each tab preserves its scroll state.
class _MainShell extends StatefulWidget {
  const _MainShell({required this.initialIndex});
  final int initialIndex;

  @override
  State<_MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<_MainShell> {
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
  }

  void _onTap(int index) {
    setState(() => _currentIndex = index);
  }

  @override
  Widget build(BuildContext context) {
    return IndexedStack(
      index: _currentIndex,
      children: [
        HomeScreen(onNavTap: _onTap), // 0 — Home
        MapScreen(onNavTap: _onTap), // 1 — Map
        // 2 — Scan (placeholder, reuses validate)
        const ValidateScreen(),
        MuseumsScreen(onNavTap: _onTap), // 3 — Browse
        ProfileScreen(onNavTap: _onTap), // 4 — Profile
      ],
    );
  }
}
