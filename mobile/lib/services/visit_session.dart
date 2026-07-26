import 'ticket_access_store.dart';

/// Legacy in-memory helpers — prefer [TicketAccessStore] for the 24-hour
/// per-museum gate. Kept so debug clears can wipe both layers if needed.
class VisitSession {
  VisitSession._();

  /// Test/debug only — clears the durable ticket cache.
  static Future<void> clear() => TicketAccessStore.clear();
}
