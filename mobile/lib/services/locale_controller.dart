import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Persisted app locale (English / Amharic). Static UI only.
class LocaleController extends ChangeNotifier {
  LocaleController._();

  static final LocaleController instance = LocaleController._();

  static const String _prefsKey = 'app_locale_code';

  Locale _locale = const Locale('en');

  Locale get locale => _locale;

  bool get isAmharic => _locale.languageCode == 'am';

  Future<void> load() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    final String? code = prefs.getString(_prefsKey);
    if (code == 'am' || code == 'en') {
      _locale = Locale(code!);
      notifyListeners();
    }
  }

  Future<void> setLocale(Locale locale) async {
    if (locale.languageCode != 'en' && locale.languageCode != 'am') {
      return;
    }
    _locale = locale;
    notifyListeners();
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefsKey, locale.languageCode);
  }
}
