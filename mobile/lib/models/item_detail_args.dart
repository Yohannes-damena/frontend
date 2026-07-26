import 'item.dart';

/// Arguments for the Item detail route — pass the bundled [Item], never refetch.
class ItemDetailArgs {
  const ItemDetailArgs({
    required this.item,
    required this.waypointId,
    this.narrationAudioUrl = '',
    this.storyOrder = 1,
  });

  final Item item;
  final String waypointId;

  /// Room narration URL (items have no separate audio in the API contract).
  final String narrationAudioUrl;

  /// Room story order — used for the AI Guide Progress chapter label.
  final int storyOrder;
}
