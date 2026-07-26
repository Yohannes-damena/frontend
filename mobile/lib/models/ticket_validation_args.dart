import 'room.dart';

/// Arguments for the ticket validation screen when gating room entry.
///
/// The room carries everything the screen needs: its id identifies the museum
/// to the backend, and its scope keys the local grant once validation succeeds.
class TicketValidationArgs {
  const TicketValidationArgs({
    required this.continueTo,
  });

  final Room continueTo;
}
