/// Lightweight room entry used only to render a museum journey trail.
class MuseumRoomSummary {
  const MuseumRoomSummary({
    required this.id,
    required this.storyOrder,
    required this.title,
  });

  final String id;
  final int storyOrder;
  final String title;
}
