import 'package:flutter/material.dart';

import '../../l10n/app_strings.dart';
import '../../models/chat_args.dart';
import '../../models/item.dart';
import '../../models/item_detail_args.dart';
import '../../widgets/ai_guide_progress_card.dart';
import '../../widgets/museum_network_image.dart';
import '../../widgets/settings_icon_button.dart';
import 'stitch_chat_screen.dart';
import 'stitch_theme.dart';

/// Item detail — data comes only from the [Item] already loaded with the room.
///
/// No network call. Fields shown: name, shortDescription, detailText, imageUrl.
/// Narration uses the room audio URL framed as AI Guide Progress.
class StitchItemDetailScreen extends StatelessWidget {
  const StitchItemDetailScreen({
    super.key,
    required this.item,
    required this.waypointId,
    this.narrationAudioUrl = '',
    this.storyOrder = 1,
  });

  final Item item;
  final String waypointId;
  final String narrationAudioUrl;
  final int storyOrder;

  factory StitchItemDetailScreen.fromArgs(ItemDetailArgs args) {
    return StitchItemDetailScreen(
      item: args.item,
      waypointId: args.waypointId,
      narrationAudioUrl: args.narrationAudioUrl,
      storyOrder: args.storyOrder,
    );
  }

  @override
  Widget build(BuildContext context) {
    final AppStrings s = AppStrings.of(context);

    return Scaffold(
      backgroundColor: StitchTheme.darkText,
      floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,
      floatingActionButton: FloatingActionButton(
        heroTag: 'item-ai-guide',
        tooltip: s.chatWithAiGuideTooltip,
        onPressed:
            () => showStitchChatSheet(
              context,
              args: ChatArgs(
                waypointId: waypointId,
                itemId: item.id,
                contextTitle: item.name,
              ),
            ),
        backgroundColor: StitchTheme.adwaGold,
        foregroundColor: StitchTheme.ink,
        elevation: 8,
        shape: const CircleBorder(
          side: BorderSide(color: StitchTheme.panel, width: 2),
        ),
        child: const Icon(Icons.chat_bubble_outline),
      ),
      body: CustomScrollView(
        slivers: <Widget>[
          SliverAppBar(
            expandedHeight: 360,
            pinned: true,
            backgroundColor: StitchTheme.darkText,
            foregroundColor: StitchTheme.parchment,
            actions: const <Widget>[SettingsIconButton()],
            flexibleSpace: FlexibleSpaceBar(
              background: MuseumNetworkImage(
                url: item.imageUrl,
                fit: BoxFit.cover,
                fallback: const ColoredBox(
                  color: StitchTheme.panel,
                  child: Center(
                    child: Icon(
                      Icons.image_not_supported_outlined,
                      color: StitchTheme.muted,
                      size: 48,
                    ),
                  ),
                ),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 24, 24, 120),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    item.name,
                    style: StitchTheme.headline(
                      size: 32,
                      color: StitchTheme.parchment,
                      weight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    item.shortDescription,
                    style: StitchTheme.body(
                      size: 18,
                      color: StitchTheme.muted,
                      height: 1.45,
                    ),
                  ),
                  if (narrationAudioUrl.isNotEmpty) ...<Widget>[
                    const SizedBox(height: 24),
                    AiGuideProgressCard(
                      audioUrl: narrationAudioUrl,
                      chapterLabel: s.chapter(storyOrder, item.name),
                      transcriptText: item.detailText,
                    ),
                  ],
                  const SizedBox(height: 24),
                  Container(
                    width: double.infinity,
                    height: 1,
                    color: StitchTheme.muted.withValues(alpha: 0.25),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    s.aboutThisPiece,
                    style: StitchTheme.overline(
                      size: 11,
                      color: StitchTheme.muted,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    item.detailText,
                    style: StitchTheme.body(
                      size: 17,
                      color: StitchTheme.parchment.withValues(alpha: 0.92),
                      height: 1.6,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
