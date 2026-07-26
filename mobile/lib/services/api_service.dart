import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import '../models/chat_message.dart';
import '../models/item.dart';
import '../models/museum_room_summary.dart';
import '../models/room.dart';
import '../models/ticket_validation_result.dart';

/// Thrown when an API call fails.
///
/// Maps the backend error shape:
/// `{ "error": { "message": "...", "code": "..." } }`
class ApiException implements Exception {
  const ApiException({
    required this.message,
    required this.code,
    this.statusCode,
  });

  final String message;
  final String code;
  final int? statusCode;

  @override
  String toString() => 'ApiException($code): $message';
}

/// Single networking entry point for the museum app.
///
/// Flip [useMockData] to `false` when the live backend is ready —
/// screens and models stay unchanged.
class ApiService {
  ApiService({
    http.Client? client,
    String? baseUrl,
  })  : baseUrl = _normalizeBaseUrl(baseUrl ?? defaultBaseUrl),
        _client = client ?? http.Client();

  /// Backend origin for every real HTTP call.
  ///
  /// Override with `--dart-define=API_BASE_URL=http://192.168.1.5:3000`.
  /// The default targets the Android emulator's alias for the host machine's
  /// `localhost:3000` (the Postman collection's `baseUrl`). iOS simulators and
  /// desktop can use `http://localhost:3000`; a physical device needs the
  /// host's LAN IP.
  static const String defaultBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000',
  );

  /// Controls mock vs real HTTP.
  ///
  /// Override with `--dart-define=USE_MOCK_DATA=false` for a live build.
  static const bool useMockData = bool.fromEnvironment(
    'USE_MOCK_DATA',
    defaultValue: true,
  );

  /// Whether debug-only tooling (QR generator, room shortcuts) may be shown.
  ///
  /// Defaults to following [useMockData], but can be turned on independently
  /// with `--dart-define=ENABLE_DEBUG_TOOLS=true` so the QR generator is still
  /// reachable when pointed at a real backend — otherwise there is no way into
  /// a room without a printed code. The `!kReleaseMode` term is not
  /// overridable, so a `--release` build never surfaces any of it regardless
  /// of how the define is set. This is the single gate all debug UI must check.
  static const bool enableDebugTools = bool.fromEnvironment(
        'ENABLE_DEBUG_TOOLS',
        defaultValue: useMockData,
      ) &&
      !kReleaseMode;

  /// Room ids offered by the DEBUG shortcuts and QR generator — never used for
  /// production navigation. Live tours always follow [Room.nextRoomId].
  ///
  /// Defaults to the mock fixtures. Point the debug tools at a real deployment
  /// with `--dart-define=DEMO_ROOM_IDS=<uuid>,<uuid>`, since seeded ids differ
  /// per environment and change whenever the database is reseeded.
  static final List<String> demoRoomIds = _parseDemoRoomIds();

  static const List<String> _mockRoomIds = <String>[
    '7a2f3e10-1b4c-4d8e-9f01-2a3b4c5d6e70',
    '8b3f4e21-2c5d-4e9f-a012-3b4c5d6e7f81',
    '9c405f32-3d6e-4fa0-b123-4c5d6e7f8092',
  ];

  static List<String> _parseDemoRoomIds() {
    const String raw = String.fromEnvironment('DEMO_ROOM_IDS');
    final List<String> ids = raw
        .split(',')
        .map((String id) => id.trim())
        .where((String id) => id.isNotEmpty)
        .toList(growable: false);
    return ids.isEmpty ? _mockRoomIds : ids;
  }

  /// Demo museum scope returned on mock waypoints and used for ticket validate.
  static const String demoMuseumScope = 'a1b2c3d4adwa4e5f8a90museum000001';

  /// Valid mock ticket codes for the Adwa demo museum.
  static const Set<String> demoValidTicketCodes = <String>{
    'ADWA-1896',
    'MENELIK',
    'TAYTU',
  };

  static const Duration _timeout = Duration(seconds: 15);

  /// Chat is slower than plain reads: Gemini reasoning + answer generation
  /// regularly exceeds 15s, and a cold path can sit near the LLM timeout.
  static const Duration _chatTimeout = Duration(seconds: 90);

  final String baseUrl;
  final http.Client _client;

  static String _normalizeBaseUrl(String value) {
    final String trimmed = value.trim();
    return trimmed.endsWith('/')
        ? trimmed.substring(0, trimmed.length - 1)
        : trimmed;
  }

  /// Turns a backend-relative path into an absolute URL.
  ///
  /// The API returns narration links as paths (`/narrate/room/:id`,
  /// `/narrate/answer/:id`), but `just_audio` and the image loader both need an
  /// absolute URL — a bare `/...` string would otherwise be misread as a
  /// bundled asset path. Absolute URLs and `assets/...` paths pass through
  /// untouched so mock mode is unaffected.
  String resolveUrl(String url) {
    final String trimmed = url.trim();
    if (trimmed.isEmpty ||
        trimmed.startsWith('http://') ||
        trimmed.startsWith('https://') ||
        trimmed.startsWith('assets/')) {
      return trimmed;
    }
    return trimmed.startsWith('/')
        ? '$baseUrl$trimmed'
        : '$baseUrl/$trimmed';
  }

  /// Points a room's narration at something the audio player can actually open.
  ///
  /// Always use `/narrate/room/:id` rather than whatever storage URL the
  /// waypoint happens to carry. That endpoint synthesizes on a cache miss,
  /// re-synthesizes when a stale `memory://` pointer survives a restart, and
  /// keeps playback same-origin with the API so browser CORP/CORS quirks on
  /// the object-storage host cannot break the player.
  Map<String, dynamic> _resolveRoomAudio(Map<String, dynamic> body, String id) {
    body['roomAudioUrl'] = '/narrate/room/$id';
    return body;
  }

  /// Rewrites every URL-bearing field of a decoded payload in place.
  Map<String, dynamic> _absolutizeUrls(Map<String, dynamic> body) {
    for (final String key in const <String>[
      'roomAudioUrl',
      'audioUrl',
      'imageUrl',
    ]) {
      final Object? value = body[key];
      if (value is String) {
        body[key] = resolveUrl(value);
      }
    }

    final Object? items = body['items'];
    if (items is List) {
      for (final Object? item in items) {
        if (item is Map<String, dynamic>) {
          _absolutizeUrls(item);
        }
      }
    }
    return body;
  }

  /// `GET /waypoint/:id` — QR payload is the room id.
  Future<Room> getWaypoint(String id) async {
    if (useMockData) {
      return _mockGetWaypoint(id);
    }
    return _realGetWaypoint(id);
  }

  /// Mock-only ordered room list for the current museum's journey trail.
  ///
  /// The real backend has no equivalent endpoint, so live mode returns null.
  /// Calling UI must fall back to its session-growing trail.
  Future<List<MuseumRoomSummary>?> getMuseumRoomList({
    required String museumScope,
  }) async {
    if (!useMockData) {
      return null;
    }

    final List<MuseumRoomSummary> rooms =
        _mockRooms.values
            .where((Room room) => room.museumScope == museumScope)
            .map(
              (Room room) => MuseumRoomSummary(
                id: room.id,
                storyOrder: room.storyOrder,
                title: room.title,
              ),
            )
            .toList(growable: false)
          ..sort(
            (MuseumRoomSummary a, MuseumRoomSummary b) =>
                a.storyOrder.compareTo(b.storyOrder),
          );
    return rooms;
  }

  /// Walks a tour forward via each room's [Room.nextRoomId], starting at
  /// [startId] (typically the first room opened after a QR scan).
  ///
  /// No museum-specific room list is assumed — the chain is entirely dynamic.
  Future<List<Room>> getTourRooms({required String startId}) async {
    final List<Room> rooms = <Room>[];
    String? currentId = startId;
    final Set<String> seen = <String>{};

    while (currentId != null && !seen.contains(currentId)) {
      seen.add(currentId);
      final Room room = await getWaypoint(currentId);
      rooms.add(room);
      currentId = room.nextRoomId;
    }
    return rooms;
  }

  /// `POST /chat` — Ask AI. [itemId] is null when asked from the room screen.
  Future<ChatResponse> postChat({
    required String waypointId,
    String? itemId,
    required String question,
  }) async {
    if (useMockData) {
      return _mockPostChat(
        waypointId: waypointId,
        itemId: itemId,
        question: question,
      );
    }
    return _realPostChat(
      waypointId: waypointId,
      itemId: itemId,
      question: question,
    );
  }

  /// `POST /tickets/validate` — one-time entry gate when the museum requires it.
  ///
  /// Identified by the scanned room: the backend resolves which museum it
  /// belongs to, since visitor responses never expose a museum id.
  Future<TicketValidationResult> validateTicket({
    required String waypointId,
    required String ticketCode,
  }) async {
    if (useMockData) {
      return _mockValidateTicket(
        waypointId: waypointId,
        ticketCode: ticketCode,
      );
    }
    return _realValidateTicket(
      waypointId: waypointId,
      ticketCode: ticketCode,
    );
  }

  void dispose() {
    _client.close();
  }

  // ── Real HTTP ───────────────────────────────────────────────────────────

  Future<Room> _realGetWaypoint(String id) async {
    final Uri uri = Uri.parse('$baseUrl/waypoint/$id');
    try {
      final http.Response response = await _client
          .get(uri, headers: _jsonHeaders)
          .timeout(_timeout);
      final Map<String, dynamic> body = _decodeBody(response);
      if (response.statusCode != 200) {
        throw _exceptionFromBody(body, response.statusCode);
      }
      return Room.fromJson(_absolutizeUrls(_resolveRoomAudio(body, id)));
    } on TimeoutException {
      throw const ApiException(
        message: 'Request timed out. Please try again.',
        code: 'TIMEOUT',
      );
    } on ApiException {
      rethrow;
    } on FormatException {
      throw const ApiException(
        message: 'Unexpected response from server.',
        code: 'INVALID_RESPONSE',
      );
    } on TypeError {
      // A required field was missing or had an unexpected type.
      throw const ApiException(
        message: 'This room could not be read. The server sent unexpected data.',
        code: 'INVALID_RESPONSE',
      );
    } on http.ClientException catch (e) {
      throw ApiException(
        message: e.message,
        code: 'NETWORK_ERROR',
      );
    }
  }

  Future<ChatResponse> _realPostChat({
    required String waypointId,
    String? itemId,
    required String question,
  }) async {
    final Uri uri = Uri.parse('$baseUrl/chat');
    // Omit itemId entirely for room-level questions; the collection's Case 2
    // request sends no key at all rather than an explicit null.
    final Map<String, dynamic> payload = <String, dynamic>{
      'waypointId': waypointId,
      if (itemId != null) 'itemId': itemId,
      'question': question,
    };
    try {
      final http.Response response = await _client
          .post(
            uri,
            headers: _jsonHeaders,
            body: jsonEncode(payload),
          )
          .timeout(_chatTimeout);
      final Map<String, dynamic> body = _decodeBody(response);
      if (response.statusCode != 200) {
        throw _exceptionFromBody(body, response.statusCode);
      }
      return ChatResponse.fromJson(_absolutizeUrls(body));
    } on TimeoutException {
      throw const ApiException(
        message: 'Request timed out. Please try again.',
        code: 'TIMEOUT',
      );
    } on ApiException {
      rethrow;
    } on FormatException {
      throw const ApiException(
        message: "Couldn't get an answer, try again.",
        code: 'INVALID_RESPONSE',
      );
    } on TypeError {
      throw const ApiException(
        message: "Couldn't get an answer, try again.",
        code: 'INVALID_RESPONSE',
      );
    } on http.ClientException catch (e) {
      throw ApiException(
        message: e.message,
        code: 'NETWORK_ERROR',
      );
    }
  }

  Future<TicketValidationResult> _realValidateTicket({
    required String waypointId,
    required String ticketCode,
  }) async {
    final Uri uri = Uri.parse('$baseUrl/tickets/validate');
    final Map<String, dynamic> payload = <String, dynamic>{
      'waypointId': waypointId,
      'ticketCode': ticketCode,
    };
    try {
      final http.Response response = await _client
          .post(
            uri,
            headers: _jsonHeaders,
            body: jsonEncode(payload),
          )
          .timeout(_timeout);
      final Map<String, dynamic> body = _decodeBody(response);
      if (response.statusCode != 200) {
        throw _exceptionFromBody(body, response.statusCode);
      }
      return TicketValidationResult.fromJson(body);
    } on TimeoutException {
      throw const ApiException(
        message: 'Request timed out. Please try again.',
        code: 'TIMEOUT',
      );
    } on ApiException {
      rethrow;
    } on FormatException {
      throw const ApiException(
        message: 'Unexpected response from server.',
        code: 'INVALID_RESPONSE',
      );
    } on http.ClientException catch (e) {
      throw ApiException(
        message: e.message,
        code: 'NETWORK_ERROR',
      );
    }
  }

  Map<String, String> get _jsonHeaders => const <String, String>{
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

  Map<String, dynamic> _decodeBody(http.Response response) {
    if (response.body.isEmpty) {
      return <String, dynamic>{};
    }
    final Object? decoded = jsonDecode(response.body);
    if (decoded is! Map<String, dynamic>) {
      throw const FormatException('Expected a JSON object');
    }
    return decoded;
  }

  ApiException _exceptionFromBody(Map<String, dynamic> body, int statusCode) {
    final Object? errorNode = body['error'];
    if (errorNode is Map<String, dynamic>) {
      final String message =
          (errorNode['message'] as String?) ?? 'Something went wrong.';
      final String code =
          (errorNode['code'] as String?) ?? 'UNKNOWN_ERROR';
      return ApiException(
        message: message,
        code: code,
        statusCode: statusCode,
      );
    }

    // Spec: 502 upstream failures should surface a generic chat-friendly message.
    if (statusCode == 502) {
      return ApiException(
        message: "Couldn't get an answer, try again.",
        code: 'UPSTREAM_ERROR',
        statusCode: statusCode,
      );
    }

    return ApiException(
      message: 'Something went wrong.',
      code: 'HTTP_$statusCode',
      statusCode: statusCode,
    );
  }

  // ── Mock data (exact contract shapes) ───────────────────────────────────

  Future<Room> _mockGetWaypoint(String id) async {
    await Future<void>.delayed(const Duration(milliseconds: 400));

    final Room? room = _mockRooms[id];
    if (room == null) {
      throw const ApiException(
        message: 'Room not found.',
        code: 'NOT_FOUND',
        statusCode: 404,
      );
    }
    return room;
  }

  Future<ChatResponse> _mockPostChat({
    required String waypointId,
    String? itemId,
    required String question,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 600));

    final Room? room = _mockRooms[waypointId];
    if (room == null) {
      throw const ApiException(
        message: 'Room not found.',
        code: 'NOT_FOUND',
        statusCode: 404,
      );
    }

    final Item? matched = _resolveMatchedItem(
      room: room,
      itemId: itemId,
      question: question,
    );

    return ChatResponse(
      answer: _buildMockAnswer(
        room: room,
        matched: matched,
        itemIdProvided: itemId != null,
        question: question,
      ),
      matchedItemId: matched?.id,
      // Only when an item is matched — never for unmatched room-level asks.
      imageUrl: matched?.imageUrl,
      audioUrl: _mockChatAudioAsset,
    );
  }

  /// Bundled placeholder — replace with real generated audio later.
  /// Load with `AudioPlayer().setAsset(...)` (drop any scheme prefix).
  static const String _mockChatAudioAsset =
      'assets/audio/guide_answer_placeholder.mp3';

  Item? _resolveMatchedItem({
    required Room room,
    String? itemId,
    required String question,
  }) {
    if (itemId != null) {
      for (final Item item in room.items) {
        if (item.id == itemId) {
          return item;
        }
      }
      return null;
    }

    // Room-level question: match an item only when the question clearly names it.
    final String q = question.toLowerCase();
    for (final Item item in room.items) {
      if (q.contains(item.name.toLowerCase())) {
        return item;
      }
    }

    if (q.contains('taytu') || q.contains('empress')) {
      return _findItemById(room, _empressTaytu.id) ??
          _findItemByNameContains(room, 'taytu');
    }
    if (q.contains('menelik') || q.contains('emperor')) {
      return _findItemById(room, _menelikCallToArms.id) ??
          _findItemByNameContains(room, 'menelik');
    }
    if (q.contains('wuchale') || q.contains('treaty')) {
      return _findItemById(room, _treatyOfWuchale.id) ??
          _findItemByNameContains(room, 'treaty');
    }
    if (q.contains('shield') || q.contains('spear')) {
      return _findItemById(room, _traditionalShieldAndSpear.id) ??
          _findItemByNameContains(room, 'shield');
    }
    if (q.contains('march') || q.contains('north') || q.contains('mekelle')) {
      return _findItemById(room, _marchNorth.id) ??
          _findItemByNameContains(room, 'march');
    }
    if (q.contains('battlefield') || q.contains('battle of adwa')) {
      return _findItemById(room, _battlefieldOfAdwa.id) ??
          _findItemByNameContains(room, 'battlefield');
    }
    if (q.contains('aftermath') ||
        q.contains('addis ababa') ||
        q.contains('legacy')) {
      return _findItemById(room, _aftermath.id) ??
          _findItemByNameContains(room, 'aftermath');
    }

    return null;
  }

  Item? _findItemById(Room room, String id) {
    for (final Item item in room.items) {
      if (item.id == id) {
        return item;
      }
    }
    return null;
  }

  Item? _findItemByNameContains(Room room, String fragment) {
    final String needle = fragment.toLowerCase();
    for (final Item item in room.items) {
      if (item.name.toLowerCase().contains(needle)) {
        return item;
      }
    }
    return null;
  }

  String _buildMockAnswer({
    required Room room,
    required Item? matched,
    required bool itemIdProvided,
    required String question,
  }) {
    final String q = question.toLowerCase().trim();
    final _QuestionLens lens = _QuestionLens.from(q);

    if (itemIdProvided && matched != null) {
      return _itemSpecificAnswer(matched, lens, question);
    }

    if (matched != null) {
      // Room-level ask that still matched an item by keyword.
      return _itemSpecificAnswer(matched, lens, question);
    }

    return _roomLevelAnswer(room, lens, question);
  }

  String _itemSpecificAnswer(Item item, _QuestionLens lens, String question) {
    final String base = switch (lens) {
      _QuestionLens.who =>
        '${item.name} is remembered for the people and leadership around it. '
            '${item.shortDescription}',
      _QuestionLens.when =>
        'In the Adwa timeline, ${item.name} belongs to the years leading to '
            'and including 1 March 1896. ${item.shortDescription}',
      _QuestionLens.where =>
        '${item.name} is tied to Ethiopia\'s northern highlands and the '
            'campaign routes that converged on Adwa. ${item.shortDescription}',
      _QuestionLens.why =>
        '${item.name} matters because it helps explain why Ethiopia could '
            'defend its sovereignty. ${item.detailText}',
      _QuestionLens.how =>
        'Looking closely at ${item.name}: ${item.detailText}',
      _QuestionLens.general =>
        'About ${item.name}: ${item.detailText}',
    };

    return '$base\n\nYou asked: "$question"';
  }

  String _roomLevelAnswer(Room room, _QuestionLens lens, String question) {
    final String base = switch (lens) {
      _QuestionLens.who =>
        'In ${room.title}, the central figures include Emperor Menelik II, '
            'Empress Taytu Betul, and the regional commanders who answered the '
            'call to arms. ${room.roomOverviewText}',
      _QuestionLens.when =>
        '${room.title} covers the late nineteenth-century crisis that peaked '
            'with the Battle of Adwa on 1 March 1896. ${room.roomOverviewText}',
      _QuestionLens.where =>
        '${room.title} is set in the Ethiopian highlands — from the path of '
            'mobilization through Mekelle to the mountains around Adwa. '
            '${room.roomOverviewText}',
      _QuestionLens.why =>
        '${room.title} explains why Ethiopia refused colonial protectorate '
            'status and fought to keep its independence. ${room.roomOverviewText}',
      _QuestionLens.how =>
        'This hall shows how diplomacy, mobilization, and battle connected: '
            '${room.roomOverviewText}',
      _QuestionLens.general =>
        'In ${room.title}: ${room.roomOverviewText}',
    };

    return '$base\n\nYou asked: "$question"';
  }

  Future<TicketValidationResult> _mockValidateTicket({
    required String waypointId,
    required String ticketCode,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 450));

    // Mirrors the real backend, which resolves the museum from the scanned
    // room. Unknown rooms still return the contract shape; the demo museum
    // always requires a ticket.
    final Room? room = _mockRooms[waypointId];
    final String normalized = ticketCode.trim().toUpperCase();

    if (room == null) {
      return const TicketValidationResult(
        valid: false,
        ticketRequired: false,
        museumScope: '',
      );
    }

    if (normalized.isEmpty) {
      return TicketValidationResult(
        valid: false,
        ticketRequired: true,
        museumScope: room.museumScope,
      );
    }

    return TicketValidationResult(
      valid: demoValidTicketCodes.contains(normalized),
      ticketRequired: true,
      museumScope: room.museumScope,
    );
  }

  static final Map<String, Room> _mockRooms = <String, Room>{
    _room1.id: _room1,
    _room2.id: _room2,
    _room3.id: _room3,
  };

  static const Item _treatyOfWuchale = Item(
    id: '1c9f8e42-5a71-4b36-9d20-6e3a7f8c1201',
    name: 'Treaty of Wuchale',
    shortDescription:
        'The disputed 1889 agreement whose conflicting texts put Ethiopian '
        'sovereignty at stake.',
    detailText:
        'Emperor Menelik II and the Kingdom of Italy concluded the Treaty of '
        'Wuchale in 1889. Its Amharic and Italian versions differed '
        'critically in Article 17: the Amharic text allowed Menelik to use '
        'Italy when conducting foreign affairs, while the Italian text made '
        'that channel obligatory and was used to claim Ethiopia as an '
        'Italian protectorate. Menelik rejected that interpretation and '
        'denounced the treaty in 1893. The dispute became a central cause of '
        'the First Italo-Ethiopian War.',
    imageUrl: 'assets/images/items/treaty_wuchale.png',
  );

  static const Item _menelikCallToArms = Item(
    id: '2da07f53-6b82-4c47-ae31-7f4b8d9e2302',
    name: 'Menelik II\'s Call to Arms',
    shortDescription:
        'The 1895 proclamation that summoned Ethiopia to resist invasion.',
    detailText:
        'As Italian forces advanced from Eritrea in 1895, Emperor Menelik II '
        'issued a nationwide call to arms. Regional rulers and communities '
        'answered with fighters, provisions, pack animals, and weapons. The '
        'mobilization brought together a large and diverse imperial army '
        'under leaders including Empress Taytu Betul, Ras Makonnen, Ras '
        'Mikael, Ras Alula, Negus Tekle Haymanot, and Fitawrari Habte '
        'Giyorgis. It transformed resistance to Italian expansion into a '
        'national campaign to defend Ethiopia\'s independence.',
    imageUrl: 'assets/images/items/menelik.png',
  );

  static const Item _empressTaytu = Item(
    id: '3eb18064-7c93-4d58-bf42-8a5c9e0f3403',
    name: 'Empress Taytu Betul',
    shortDescription:
        'A strategist, political leader, and commander in the Adwa campaign.',
    detailText:
        'Empress Taytu Betul was central to Ethiopia\'s resistance. She '
        'strongly opposed Italy\'s protectorate claim, helped mobilize and '
        'supply the imperial army, and accompanied the campaign with forces '
        'under her command. During the siege of the Italian fort at Mekelle, '
        'she supported the strategy of controlling its water supply, helping '
        'force the garrison to surrender. At Adwa she remained an active '
        'leader, while women throughout the campaign carried provisions, '
        'nursed the wounded, gathered intelligence, and sustained morale.',
    imageUrl: 'assets/images/items/taytu.png',
  );

  static const Item _traditionalShieldAndSpear = Item(
    id: '4fc29175-8da4-4e69-8053-9b6d0f1a4504',
    name: 'Traditional Shield and Spear',
    shortDescription:
        'Weapons that carried martial tradition into a changing age of war.',
    detailText:
        'Ethiopian fighters carried equipment that reflected region, rank, '
        'and available resources. Hide shields and spears remained important '
        'symbols of warrior identity and were still used in combat, but the '
        'army at Adwa was not armed only with traditional weapons. Many '
        'soldiers also carried modern rifles, and Menelik\'s forces deployed '
        'artillery. This combination of established martial traditions, '
        'firearms, and knowledge of the highland terrain challenges colonial '
        'portrayals of an ill-equipped Ethiopian army.',
    imageUrl: 'assets/images/items/shield_spear.png',
  );

  static const Item _marchNorth = Item(
    id: '50d3a286-9eb5-4f7a-9164-ac7e102b5605',
    name: 'The March North',
    shortDescription:
        'A vast army crossed the highlands toward Mekelle and Adwa.',
    detailText:
        'Answering Menelik\'s call, forces from across Ethiopia assembled and '
        'moved north through difficult highland country. The campaign '
        'depended on careful movement, local knowledge, and enormous systems '
        'of supply. Fighters and camp followers carried food and equipment '
        'while communities supported the army along the route. After the '
        'Italian position at Mekelle surrendered in January 1896, the '
        'Ethiopian host continued toward Adwa, where the decisive encounter '
        'would take place.',
    imageUrl: 'assets/images/items/red_tent.png',
  );

  static const Item _battlefieldOfAdwa = Item(
    id: '61e4b397-afc6-408b-a275-bd8f213c6706',
    name: 'Battlefield of Adwa',
    shortDescription:
        'The northern highlands where Ethiopian forces defeated Italy on '
        '1 March 1896.',
    detailText:
        'Before dawn on 1 March 1896, Italian forces advanced in separated '
        'columns through the rugged country around Adwa. Confused maps, '
        'difficult terrain, and poor coordination left those columns unable '
        'to support one another effectively. Ethiopian forces under Menelik '
        'II, Empress Taytu, and leading regional commanders engaged them in '
        'a series of fierce actions. Ethiopia\'s larger, well-armed, and '
        'coordinated army decisively defeated the invasion force, preserving '
        'the country\'s sovereignty.',
    imageUrl: 'assets/images/items/battle.png',
  );

  static const Item _aftermath = Item(
    id: '72f5c4a8-b0d7-419c-b386-ce90424d7807',
    name: 'The Aftermath',
    shortDescription:
        'A victory that secured Ethiopian independence and resonated far '
        'beyond the battlefield.',
    detailText:
        'The defeat at Adwa forced Italy to negotiate. In the Treaty of Addis '
        'Ababa, signed in October 1896, Italy recognized Ethiopia\'s '
        'independence and the Treaty of Wuchale was annulled. Ethiopia stood '
        'as a sovereign African state during the height of European colonial '
        'expansion. The victory strengthened national unity and became an '
        'enduring source of pride for Ethiopians and a powerful symbol for '
        'African and Black movements resisting colonialism and racism around '
        'the world.',
    imageUrl: 'assets/images/items/newspaper_clippings.png',
  );

  static const Room _room1 = Room(
    id: '7a2f3e10-1b4c-4d8e-9f01-2a3b4c5d6e70',
    museumScope: demoMuseumScope,
    storyOrder: 1,
    title: 'Prelude to a Nation\'s Stand',
    roomOverviewText:
        'The road to Adwa began with a struggle over sovereignty. The 1889 '
        'Treaty of Wuchale contained conflicting Amharic and Italian wording '
        'that Italy used to declare Ethiopia its protectorate. Emperor '
        'Menelik II rejected the claim, denounced the treaty, and pursued '
        'diplomacy while strengthening Ethiopia\'s defenses. When Italian '
        'forces advanced in 1895, his call to arms united rulers and '
        'communities from across the empire in a national stand against '
        'colonial conquest.',
    roomAudioUrl:
        'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    nextRoomId: '8b3f4e21-2c5d-4e9f-a012-3b4c5d6e7f81',
    items: <Item>[_treatyOfWuchale, _menelikCallToArms],
  );

  static const Room _room2 = Room(
    id: '8b3f4e21-2c5d-4e9f-a012-3b4c5d6e7f81',
    museumScope: demoMuseumScope,
    storyOrder: 2,
    title: 'Mobilization Hall',
    roomOverviewText:
        'Menelik\'s mobilization brought together a large, diverse army led '
        'by imperial and regional commanders. Empress Taytu Betul played a '
        'major political, logistical, and military role. Fighters marched '
        'north with traditional shields and spears, modern rifles, artillery, '
        'pack animals, and provisions gathered across the country. Their '
        'journey through the highlands, including the campaign at Mekelle, '
        'prepared the ground for the confrontation at Adwa.',
    roomAudioUrl:
        'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    nextRoomId: '9c405f32-3d6e-4fa0-b123-4c5d6e7f8092',
    items: <Item>[
      _empressTaytu,
      _traditionalShieldAndSpear,
      _marchNorth,
    ],
  );

  static const Room _room3 = Room(
    id: '9c405f32-3d6e-4fa0-b123-4c5d6e7f8092',
    museumScope: demoMuseumScope,
    storyOrder: 3,
    title: 'The Battle of Adwa',
    roomOverviewText:
        'On 1 March 1896, Ethiopian forces defeated Italy\'s invasion army in '
        'the mountains around Adwa. The victory was the result of national '
        'mobilization, experienced leadership, substantial firepower, and '
        'the failure of separated Italian columns to coordinate in difficult '
        'terrain. The Treaty of Addis Ababa later recognized Ethiopia\'s '
        'independence. Adwa became a landmark in African history and an '
        'international symbol of resistance to colonial rule.',
    roomAudioUrl:
        'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    nextRoomId: null,
    items: <Item>[_battlefieldOfAdwa, _aftermath],
  );
}

enum _QuestionLens {
  who,
  when,
  where,
  why,
  how,
  general;

  static _QuestionLens from(String questionLower) {
    if (_hasWord(questionLower, <String>['who', 'whose'])) {
      return _QuestionLens.who;
    }
    if (_hasWord(questionLower, <String>['when', 'year', 'date'])) {
      return _QuestionLens.when;
    }
    if (_hasWord(questionLower, <String>['where', 'location', 'place'])) {
      return _QuestionLens.where;
    }
    if (_hasWord(questionLower, <String>['why', 'reason', 'cause'])) {
      return _QuestionLens.why;
    }
    if (_hasWord(questionLower, <String>['how'])) {
      return _QuestionLens.how;
    }
    if (questionLower.contains('menelik') || questionLower.contains('taytu')) {
      return _QuestionLens.who;
    }
    return _QuestionLens.general;
  }

  static bool _hasWord(String text, List<String> words) {
    for (final String word in words) {
      if (RegExp('\\b${RegExp.escape(word)}\\b').hasMatch(text)) {
        return true;
      }
    }
    return false;
  }
}
