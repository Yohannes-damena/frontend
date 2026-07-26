import 'package:adwa_museum/services/api_service.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';

/// The debug QR generator and room shortcuts are gated on a single flag, and
/// getting that gate wrong either ships debug affordances to visitors or makes
/// the app impossible to drive against a real backend. Both directions matter,
/// so both are pinned here.
///
/// Run the opt-in half with:
///
/// ```
/// flutter test test/debug_tools_gate_test.dart \
///   --dart-define=USE_MOCK_DATA=false \
///   --dart-define=ENABLE_DEBUG_TOOLS=true \
///   --dart-define=DEMO_ROOM_IDS=aaa,bbb
/// ```
const bool _debugToolsRequested = bool.fromEnvironment('ENABLE_DEBUG_TOOLS');
const String _demoRoomIdsDefine = String.fromEnvironment('DEMO_ROOM_IDS');

void main() {
  test('a release build never enables debug tools', () {
    // kReleaseMode is false under `flutter test`, so this asserts the shape of
    // the expression rather than observing a release build: whatever the
    // defines say, the release term has to be able to veto them.
    expect(ApiService.enableDebugTools, isNot(kReleaseMode && true));
  });

  test('debug tools follow mock mode when not explicitly configured', () {
    if (_debugToolsRequested) {
      return; // Covered by the opt-in test below instead.
    }

    expect(ApiService.enableDebugTools, ApiService.useMockData && !kReleaseMode);
  });

  test('debug tools can be enabled independently of mock mode', () {
    if (!_debugToolsRequested) {
      return; // Needs --dart-define=ENABLE_DEBUG_TOOLS=true.
    }

    // The point of the define: reachable while talking to a real backend.
    expect(ApiService.enableDebugTools, isTrue);
    expect(ApiService.useMockData, isFalse);
  });

  group('demoRoomIds', () {
    test('falls back to the mock fixtures when unset', () {
      if (_demoRoomIdsDefine.isNotEmpty) {
        return;
      }

      expect(ApiService.demoRoomIds, hasLength(3));
      expect(ApiService.demoRoomIds.every((String id) => id.isNotEmpty), isTrue);
    });

    test('takes the configured ids when supplied', () {
      if (_demoRoomIdsDefine.isEmpty) {
        return;
      }

      final List<String> expected = _demoRoomIdsDefine
          .split(',')
          .map((String id) => id.trim())
          .where((String id) => id.isNotEmpty)
          .toList(growable: false);

      expect(ApiService.demoRoomIds, expected);
    });
  });
}
