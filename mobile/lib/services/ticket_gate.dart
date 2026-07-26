import 'package:flutter/material.dart';

import '../models/room.dart';
import '../models/ticket_validation_args.dart';
import '../screens/stitch_export/stitch_routes.dart';
import 'ticket_access_store.dart';

/// One-time-per-museum ticket gate before opening a [Room].
///
/// Uses [Room.museumScope] from the waypoint response. Access is cached per
/// museum scope (24h after a successful ticket, or permanently when the API
/// reports tickets are not required).
class TicketGate {
  TicketGate._();

  /// Returns true if the visitor may open [room] (already granted or just
  /// validated). Returns false if they backed out of the ticket screen.
  static Future<bool> ensureAccess(
    BuildContext context, {
    required Room room,
  }) async {
    final String museumScope = room.museumScope.trim();
    // An older backend that sends no scope leaves the gate open rather than
    // locking every visitor out of a museum it cannot identify.
    if (museumScope.isEmpty) {
      return true;
    }

    if (await TicketAccessStore.isAccessGranted(museumScope)) {
      return true;
    }

    if (!context.mounted) {
      return false;
    }

    final Object? result = await Navigator.pushNamed(
      context,
      StitchRoutes.validate,
      arguments: TicketValidationArgs(continueTo: room),
    );

    return result == true;
  }
}
