import 'package:adwa_museum/models/museum_room_summary.dart';
import 'package:adwa_museum/models/room.dart';
import 'package:adwa_museum/services/api_service.dart';
import 'package:adwa_museum/widgets/journey_trail_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const Room visitedRoom = Room(
    id: 'room-1',
    museumScope: 'museum-scope-1',
    storyOrder: 1,
    title: 'First room',
    roomOverviewText: '',
    roomAudioUrl: '',
    nextRoomId: 'room-2',
    items: <Never>[],
  );

  testWidgets('full trail shows every known room without a synthetic Next dot', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: JourneyTrailCard(
            visitedRooms: <Room>[visitedRoom],
            currentRoomId: 'room-1',
            hasNextRoom: true,
            fullRoomList: <MuseumRoomSummary>[
              MuseumRoomSummary(id: 'room-1', storyOrder: 1, title: 'First'),
              MuseumRoomSummary(id: 'room-2', storyOrder: 2, title: 'Second'),
              MuseumRoomSummary(id: 'room-3', storyOrder: 3, title: 'Third'),
            ],
          ),
        ),
      ),
    );

    expect(find.text('1'), findsOneWidget);
    expect(find.text('2'), findsOneWidget);
    expect(find.text('3'), findsOneWidget);
    expect(find.text('Next'), findsNothing);
  });

  testWidgets('growing trail adds one Next dot when no full list exists', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: JourneyTrailCard(
            visitedRooms: <Room>[visitedRoom],
            currentRoomId: 'room-1',
            hasNextRoom: true,
          ),
        ),
      ),
    );

    expect(find.text('1'), findsOneWidget);
    expect(find.text('Next'), findsOneWidget);
  });

  test('mock room-list endpoint follows build mode', () async {
    final ApiService api = ApiService();
    addTearDown(api.dispose);

    final List<MuseumRoomSummary>? rooms = await api.getMuseumRoomList(
      museumScope: ApiService.demoMuseumScope,
    );

    if (ApiService.useMockData) {
      expect(rooms, isNotNull);
      expect(rooms!.map((MuseumRoomSummary room) => room.storyOrder), <int>[
        1,
        2,
        3,
      ]);
    } else {
      expect(rooms, isNull);
    }
  });
}
