/// Response from `POST /chat` (Ask AI).
///
/// [audioUrl] is always present — every answer includes generated audio.
/// [matchedItemId] and [imageUrl] may be null when no item was matched.
typedef ChatMessage = ChatResponse;

class ChatResponse {
  const ChatResponse({
    required this.answer,
    this.matchedItemId,
    this.imageUrl,
    required this.audioUrl,
  });

  final String answer;
  final String? matchedItemId;
  final String? imageUrl;
  final String audioUrl;

  factory ChatResponse.fromJson(Map<String, dynamic> json) {
    return ChatResponse(
      answer: json['answer'] as String? ?? '',
      matchedItemId: json['matchedItemId'] as String?,
      imageUrl: json['imageUrl'] as String?,
      // Documented as always present; parsed defensively so a missing link
      // degrades to "no audio" rather than failing the whole answer.
      audioUrl: json['audioUrl'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'answer': answer,
      'matchedItemId': matchedItemId,
      'imageUrl': imageUrl,
      'audioUrl': audioUrl,
    };
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        other is ChatResponse &&
            other.answer == answer &&
            other.matchedItemId == matchedItemId &&
            other.imageUrl == imageUrl &&
            other.audioUrl == audioUrl;
  }

  @override
  int get hashCode => Object.hash(
        answer,
        matchedItemId,
        imageUrl,
        audioUrl,
      );
}
