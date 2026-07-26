import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// Local, per-museum ticket access cache.
///
/// Keys are **museum scopes** — the backend's opaque per-museum identifier —
/// never room ids and never a single global flag.
///
/// - Successful ticket validation → `ticket_validations_v1` map entry
///   `{ [museumScope]: ISO-8601 validatedAt }` valid for [ttl] (24 hours).
/// - `ticketRequired: false` → museum scope listed under
///   `ticket_not_required_v1` (permanent skip; no 24h timestamp stored).
class TicketAccessStore {
  TicketAccessStore._();

  static const Duration ttl = Duration(hours: 24);

  /// Map of museumScope → validatedAt (ISO-8601). One entry per museum.
  static const String _validationsKey = 'ticket_validations_v1';

  /// Museums that returned ticketRequired:false — permanent skip list.
  static const String _notRequiredKey = 'ticket_not_required_v1';

  /// Whether this [museumScope] may enter rooms without showing the ticket UI.
  static Future<bool> isAccessGranted(String museumScope) async {
    final String id = museumScope.trim();
    if (id.isEmpty) {
      return true;
    }

    final SharedPreferences prefs = await SharedPreferences.getInstance();

    final Set<String> notRequired = _readStringSet(prefs, _notRequiredKey);
    if (notRequired.contains(id)) {
      return true;
    }

    final Map<String, String> validations = _readValidations(prefs);
    final String? raw = validations[id];
    if (raw == null) {
      return false;
    }

    final DateTime? validatedAt = DateTime.tryParse(raw);
    if (validatedAt == null) {
      return false;
    }

    final DateTime expiry = validatedAt.toUtc().add(ttl);
    return DateTime.now().toUtc().isBefore(expiry);
  }

  /// Stores `{ museumScope, validatedAt: now }` for the 24-hour gate.
  ///
  /// Does not affect other museums' entries.
  static Future<void> markValidated(String museumScope) async {
    final String id = museumScope.trim();
    if (id.isEmpty) {
      return;
    }

    final SharedPreferences prefs = await SharedPreferences.getInstance();
    final Map<String, String> validations = _readValidations(prefs);
    validations[id] = DateTime.now().toUtc().toIso8601String();
    await prefs.setString(_validationsKey, jsonEncode(validations));
  }

  /// Permanent skip for museums that do not require tickets.
  ///
  /// Does **not** write a 24-hour validation timestamp — only the museum scope
  /// on the not-required list (so we never re-prompt for that museum).
  static Future<void> markTicketNotRequired(String museumScope) async {
    final String id = museumScope.trim();
    if (id.isEmpty) {
      return;
    }

    final SharedPreferences prefs = await SharedPreferences.getInstance();
    final Set<String> notRequired = _readStringSet(prefs, _notRequiredKey);
    if (notRequired.add(id)) {
      await prefs.setStringList(_notRequiredKey, notRequired.toList());
    }
  }

  /// Test/debug — clears all ticket cache state.
  static Future<void> clear() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.remove(_validationsKey);
    await prefs.remove(_notRequiredKey);
  }

  static Map<String, String> _readValidations(SharedPreferences prefs) {
    final String? raw = prefs.getString(_validationsKey);
    if (raw == null || raw.isEmpty) {
      return <String, String>{};
    }
    try {
      final Object? decoded = jsonDecode(raw);
      if (decoded is! Map) {
        return <String, String>{};
      }
      return decoded.map(
        (Object? key, Object? value) => MapEntry(
          key.toString(),
          value.toString(),
        ),
      );
    } catch (_) {
      return <String, String>{};
    }
  }

  static Set<String> _readStringSet(SharedPreferences prefs, String key) {
    final List<String>? list = prefs.getStringList(key);
    if (list == null) {
      return <String>{};
    }
    return list.toSet();
  }
}
