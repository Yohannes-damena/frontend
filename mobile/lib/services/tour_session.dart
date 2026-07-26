import '../models/room.dart';

/// In-memory tour context driven only by scanned/opened rooms.
///
/// No museum-specific room order is hardcoded. Explore walks forward from
/// [tourStartRoomId] using each room's [Room.nextRoomId].
class TourSession {
  TourSession._();

  static String? _museumScope;
  static String? _tourStartRoomId;
  static Room? _currentRoom;
  static final Map<String, Room> _visitedRooms = <String, Room>{};

  /// Identifies the museum being toured only well enough to notice a change of
  /// museum; it is the backend's opaque scope, not a real museum id.
  static String? get museumScope => _museumScope;

  /// First room opened for the active museum — Explore starts here.
  static String? get tourStartRoomId => _tourStartRoomId;

  static Room? get currentRoom => _currentRoom;

  /// Rooms opened in this museum session, ordered dynamically by storyOrder.
  ///
  /// The collection grows as rooms are visited; no total room count or fixed
  /// museum map is assumed.
  static List<Room> get visitedRooms {
    final List<Room> rooms = _visitedRooms.values.toList(growable: false);
    rooms.sort((Room a, Room b) {
      final int byOrder = a.storyOrder.compareTo(b.storyOrder);
      return byOrder != 0 ? byOrder : a.id.compareTo(b.id);
    });
    return rooms;
  }

  /// Call whenever a room is successfully entered (after scan / next / explore).
  static void noteRoomOpened(Room room) {
    final String museum = room.museumScope.trim();
    final bool museumChanged =
        _museumScope != null && museum.isNotEmpty && museum != _museumScope;

    if (_tourStartRoomId == null || museumChanged) {
      _tourStartRoomId = room.id;
      _museumScope = museum.isEmpty ? null : museum;
      if (museumChanged) {
        _visitedRooms.clear();
      }
    } else if (_museumScope == null && museum.isNotEmpty) {
      _museumScope = museum;
    }

    _currentRoom = room;
    _visitedRooms[room.id] = room;
  }

  static void clear() {
    _museumScope = null;
    _tourStartRoomId = null;
    _currentRoom = null;
    _visitedRooms.clear();
  }
}
