@Tags(<String>['live'])
library;

import 'package:adwa_museum/models/chat_message.dart';
import 'package:adwa_museum/models/room.dart';
import 'package:adwa_museum/models/ticket_validation_result.dart';
import 'package:adwa_museum/services/api_service.dart';
import 'package:flutter_test/flutter_test.dart';

/// End-to-end checks against a running backend.
///
/// Excluded from the default suite (see `dart_test.yaml`) because they need the
/// API up. Run them with the backend reachable and mocks disabled:
///
/// ```
/// flutter test test/live_backend_test.dart --tags live \
///   --dart-define=USE_MOCK_DATA=false \
///   --dart-define=API_BASE_URL=http://localhost:3000 \
///   --dart-define=LIVE_ROOM_ID=<a seeded room uuid> \
///   --dart-define=LIVE_TICKET_CODE=<a code the ticket vendor accepts>
/// ```
const String _baseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://localhost:3000',
);
const String _roomId = String.fromEnvironment('LIVE_ROOM_ID');
const String _ticketCode = String.fromEnvironment('LIVE_TICKET_CODE');

void main() {
  if (_roomId.isEmpty) {
    // Keeps a plain `flutter test` offline: without a room id there is nothing
    // to ask the backend for, so the suite reports itself skipped rather than
    // failing on a connection refused.
    test(
      'live backend suite',
      () {},
      skip: 'pass --dart-define=LIVE_ROOM_ID=<uuid> to run against a backend',
    );
    return;
  }

  if (ApiService.useMockData) {
    // Guards against a false pass: with mocks on, none of this touches HTTP.
    test('live backend suite needs --dart-define=USE_MOCK_DATA=false', () {
      fail('ApiService.useMockData is true, so no request would be made.');
    });
    return;
  }

  late ApiService api;

  setUp(() => api = ApiService(baseUrl: _baseUrl));
  tearDown(() => api.dispose());

  group('GET /waypoint/:id', () {
    test('parses a room and its items', () async {
      final Room room = await api.getWaypoint(_roomId);

      expect(room.id, _roomId);
      expect(room.title, isNotEmpty);
      expect(room.roomOverviewText, isNotEmpty);
      expect(room.items, isNotEmpty);
      expect(room.items.first.name, isNotEmpty);
    });

    test('yields a narration url the audio player can open', () async {
      final Room room = await api.getWaypoint(_roomId);

      // Cold path sends roomAudioUrl: null and the dev store sends
      // memory://...; neither is fetchable, so the client must substitute
      // the streaming endpoint.
      expect(room.roomAudioUrl, startsWith('http'));
      expect(room.roomAudioUrl, isNot(contains('memory://')));
    });

    test('maps an unknown room to an ApiException, not a crash', () async {
      await expectLater(
        api.getWaypoint('00000000-0000-0000-0000-000000000000'),
        throwsA(
          isA<ApiException>()
              .having((ApiException e) => e.code, 'code', 'NOT_FOUND')
              .having((ApiException e) => e.statusCode, 'statusCode', 404),
        ),
      );
    });
  });

  group('POST /chat', () {
    test('answers and returns an absolute answer-audio url', () async {
      final ChatResponse response = await api.postChat(
        waypointId: _roomId,
        question: 'What is this room about?',
      );

      expect(response.answer, isNotEmpty);
      expect(response.audioUrl, startsWith('$_baseUrl/narrate/answer/'));
    });
  });

  group('POST /tickets/validate', () {
    test('accepts a code the vendor recognises', () async {
      final TicketValidationResult result = await api.validateTicket(
        waypointId: _roomId,
        ticketCode: _ticketCode,
      );

      expect(result.valid, isTrue);
    });

    test('rejects an unrecognised code without throwing', () async {
      final TicketValidationResult result = await api.validateTicket(
        waypointId: _roomId,
        ticketCode: 'NOT-A-REAL-TICKET',
      );

      // A wrong code is a normal negative answer, not a transport failure —
      // the ticket screen shows a retry rather than an error state.
      expect(result.valid, isFalse);
    });

    test('404s a room that does not exist', () async {
      await expectLater(
        api.validateTicket(
          waypointId: '00000000-0000-4000-8000-000000000000',
          ticketCode: _ticketCode,
        ),
        throwsA(
          isA<ApiException>()
              .having((ApiException e) => e.code, 'code', 'NOT_FOUND'),
        ),
      );
    });
  });

  group('ticket gate wiring', () {
    test('the waypoint carries the scope the gate keys on', () async {
      final Room room = await api.getWaypoint(_roomId);

      expect(room.museumScope, isNotEmpty);
    });

    test('validation reports the same scope the waypoint did', () async {
      final Room room = await api.getWaypoint(_roomId);
      final TicketValidationResult result = await api.validateTicket(
        waypointId: _roomId,
        ticketCode: _ticketCode,
      );

      // The grant is cached under this key, so a mismatch would silently scope
      // it to nothing and re-prompt on the next room.
      expect(result.museumScope, room.museumScope);
    });
  });
}
