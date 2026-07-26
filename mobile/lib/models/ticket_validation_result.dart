/// Response from `POST /tickets/validate`.
class TicketValidationResult {
  const TicketValidationResult({
    required this.valid,
    required this.ticketRequired,
    required this.museumScope,
  });

  final bool valid;
  final bool ticketRequired;

  /// Opaque per-museum key matching `Room.museumScope`. The grant is cached
  /// against this so it covers every room of the museum, not just the scanned
  /// one. Empty if an older backend omits it, which leaves the grant uncached.
  final String museumScope;

  factory TicketValidationResult.fromJson(Map<String, dynamic> json) {
    return TicketValidationResult(
      valid: json['valid'] as bool? ?? false,
      ticketRequired: json['ticketRequired'] as bool? ?? true,
      museumScope: json['museumScope'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'valid': valid,
      'ticketRequired': ticketRequired,
      'museumScope': museumScope,
    };
  }
}
