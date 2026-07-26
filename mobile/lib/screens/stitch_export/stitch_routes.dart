import 'package:flutter/material.dart';

import '../../models/chat_args.dart';
import '../../models/item.dart';
import '../../models/item_detail_args.dart';
import '../../models/room.dart';
import '../../models/ticket_validation_args.dart';

/// Named routes for the museum guide flow.
class StitchRoutes {
  StitchRoutes._();

  static const String welcome = '/';
  static const String validate = '/validate';
  static const String home = '/home';
  static const String room = '/room';
  static const String item = '/item';
  static const String chat = '/chat';
  static const String settings = '/settings';

  /// DEBUG ONLY — demo QR codes. Only routed when enableDebugTools is true.
  static const String debugQr = '/debug-qr';

  static Route<dynamic> fadeRoute(Widget page) {
    return PageRouteBuilder<dynamic>(
      pageBuilder: (_, __, ___) => page,
      transitionsBuilder: (_, Animation<double> animation, __, Widget child) {
        return FadeTransition(opacity: animation, child: child);
      },
      transitionDuration: const Duration(milliseconds: 350),
    );
  }

  static Room? roomFromArgs(Object? arguments) {
    if (arguments is Room) {
      return arguments;
    }
    return null;
  }

  static TicketValidationArgs? ticketArgsFrom(Object? arguments) {
    return arguments is TicketValidationArgs ? arguments : null;
  }

  static ItemDetailArgs? itemArgsFrom(Object? arguments) {
    if (arguments is ItemDetailArgs) {
      return arguments;
    }
    if (arguments is Item) {
      // Fallback if only an Item was passed — waypointId unknown.
      return ItemDetailArgs(item: arguments, waypointId: '');
    }
    return null;
  }

  static ChatArgs? chatArgsFrom(Object? arguments) {
    return arguments is ChatArgs ? arguments : null;
  }
}
