import 'item.dart';

/// A museum room (waypoint) from `GET /waypoint/:id`.
///
/// The scanned QR code is this room's [id]. [museumScope] groups rooms by their
/// parent museum for ticket gating (one-time per museum, not per room).
///
/// There is no room-level image — use the first item's [Item.imageUrl] or a
/// static branded background.
class Room {
  const Room({
    required this.id,
    required this.museumScope,
    required this.storyOrder,
    required this.title,
    required this.roomOverviewText,
    required this.roomAudioUrl,
    this.nextRoomId,
    required this.items,
  });

  final String id;

  /// Opaque per-museum key, not the museum's real id — the backend withholds
  /// that. Used only to group local ticket grants by museum.
  final String museumScope;

  final int storyOrder;
  final String title;
  final String roomOverviewText;
  final String roomAudioUrl;
  final String? nextRoomId;
  final List<Item> items;

  /// Only [id] is treated as mandatory.
  ///
  /// `roomAudioUrl` is absent until the backend has synthesized narration for
  /// this room at least once (`GET /narrate/room/:id` persists it), so it is
  /// parsed as optional and the UI hides the player while it is empty.
  factory Room.fromJson(Map<String, dynamic> json) {
    final List<dynamic> rawItems = json['items'] as List<dynamic>? ?? <dynamic>[];
    return Room(
      id: json['id'] as String,
      museumScope: json['museumScope'] as String? ?? '',
      storyOrder: (json['storyOrder'] as num?)?.toInt() ?? 0,
      title: json['title'] as String? ?? '',
      roomOverviewText: json['roomOverviewText'] as String? ?? '',
      roomAudioUrl: json['roomAudioUrl'] as String? ?? '',
      nextRoomId: json['nextRoomId'] as String?,
      items: rawItems
          .whereType<Map<String, dynamic>>()
          .map(Item.fromJson)
          .toList(growable: false),
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'museumScope': museumScope,
      'storyOrder': storyOrder,
      'title': title,
      'roomOverviewText': roomOverviewText,
      'roomAudioUrl': roomAudioUrl,
      'nextRoomId': nextRoomId,
      'items': items.map((Item item) => item.toJson()).toList(growable: false),
    };
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Room) {
      return false;
    }
    if (other.id != id ||
        other.museumScope != museumScope ||
        other.storyOrder != storyOrder ||
        other.title != title ||
        other.roomOverviewText != roomOverviewText ||
        other.roomAudioUrl != roomAudioUrl ||
        other.nextRoomId != nextRoomId ||
        other.items.length != items.length) {
      return false;
    }
    for (int i = 0; i < items.length; i++) {
      if (other.items[i] != items[i]) {
        return false;
      }
    }
    return true;
  }

  @override
  int get hashCode => Object.hash(
        id,
        museumScope,
        storyOrder,
        title,
        roomOverviewText,
        roomAudioUrl,
        nextRoomId,
        Object.hashAll(items),
      );
}
