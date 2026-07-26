/// An exhibit item bundled inside a [Room] from `GET /waypoint/:id`.
///
/// There is no separate items endpoint — pass this object when the user
/// taps an item; do not fetch again.
class Item {
  const Item({
    required this.id,
    required this.name,
    required this.shortDescription,
    required this.detailText,
    required this.imageUrl,
  });

  final String id;
  final String name;
  final String shortDescription;
  final String detailText;
  final String imageUrl;

  /// Only [id] is treated as mandatory; text and image fields fall back to
  /// empty so one incomplete record cannot break a whole room.
  factory Item.fromJson(Map<String, dynamic> json) {
    return Item(
      id: json['id'] as String,
      name: json['name'] as String? ?? '',
      shortDescription: json['shortDescription'] as String? ?? '',
      detailText: json['detailText'] as String? ?? '',
      imageUrl: json['imageUrl'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'name': name,
      'shortDescription': shortDescription,
      'detailText': detailText,
      'imageUrl': imageUrl,
    };
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        other is Item &&
            other.id == id &&
            other.name == name &&
            other.shortDescription == shortDescription &&
            other.detailText == detailText &&
            other.imageUrl == imageUrl;
  }

  @override
  int get hashCode => Object.hash(
        id,
        name,
        shortDescription,
        detailText,
        imageUrl,
      );
}
