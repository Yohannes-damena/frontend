import 'package:flutter/material.dart';
import 'package:just_audio/just_audio.dart';
import 'package:rxdart/rxdart.dart';

import '../l10n/app_strings.dart';
import '../screens/stitch_export/stitch_theme.dart';

/// Shared "AI Guide Progress" narration card (chapter label + progress bar).
///
/// Audio plays underneath; the UI frames progress through the story, not a
/// raw scrubber-first player.
class AiGuideProgressCard extends StatefulWidget {
  const AiGuideProgressCard({
    super.key,
    required this.audioUrl,
    required this.chapterLabel,
    this.transcriptText = '',
    this.autoplay = false,
  });

  final String audioUrl;
  final String chapterLabel;
  final String transcriptText;
  final bool autoplay;

  @override
  State<AiGuideProgressCard> createState() => _AiGuideProgressCardState();
}

class _PositionData {
  const _PositionData(this.position, this.duration);

  final Duration position;
  final Duration duration;
}

class _AiGuideProgressCardState extends State<AiGuideProgressCard> {
  final AudioPlayer _player = AudioPlayer();
  bool _ready = false;
  bool _loadFailed = false;

  Stream<_PositionData> get _positionDataStream =>
      Rx.combineLatest2<Duration, Duration?, _PositionData>(
        _player.positionStream,
        _player.durationStream,
        (Duration position, Duration? duration) =>
            _PositionData(position, duration ?? Duration.zero),
      );

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(covariant AiGuideProgressCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.audioUrl != widget.audioUrl) {
      _load();
    }
  }

  @override
  void dispose() {
    _player.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final String url = widget.audioUrl.trim();
    if (url.isEmpty) {
      setState(() {
        _ready = false;
        _loadFailed = true;
      });
      return;
    }

    setState(() {
      _ready = false;
      _loadFailed = false;
    });

    try {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        await _player.setUrl(url);
      } else {
        await _player.setAsset(url);
      }
      if (!mounted) {
        return;
      }
      setState(() => _ready = true);
      if (widget.autoplay) {
        await _player.play();
      }
    } catch (_) {
      if (mounted) {
        setState(() => _loadFailed = true);
      }
    }
  }

  Future<void> _toggle() async {
    if (!_ready || _loadFailed) {
      return;
    }
    if (_player.playing) {
      await _player.pause();
    } else {
      if (_player.processingState == ProcessingState.completed) {
        await _player.seek(Duration.zero);
      }
      await _player.play();
    }
  }

  String _format(Duration d) {
    final int totalSeconds = d.inSeconds.clamp(0, 999 * 60);
    final int m = totalSeconds ~/ 60;
    final int s = totalSeconds % 60;
    return '$m:${s.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final AppStrings s = AppStrings.of(context);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: StitchTheme.panel,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: StitchTheme.muted.withValues(alpha: 0.22)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: <Widget>[
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      s.aiGuideProgress,
                      style: StitchTheme.overline(
                        size: 11,
                        color: StitchTheme.muted,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      widget.chapterLabel,
                      style: StitchTheme.body(
                        size: 16,
                        weight: FontWeight.w600,
                        color: StitchTheme.parchment,
                      ),
                    ),
                  ],
                ),
              ),
              StreamBuilder<PlayerState>(
                stream: _player.playerStateStream,
                builder: (
                  BuildContext context,
                  AsyncSnapshot<PlayerState> snapshot,
                ) {
                  final bool playing = snapshot.data?.playing ?? false;
                  return IconButton(
                    onPressed: _ready && !_loadFailed ? _toggle : null,
                    style: IconButton.styleFrom(
                      backgroundColor: StitchTheme.adwaGold.withValues(
                        alpha: 0.16,
                      ),
                      foregroundColor: StitchTheme.adwaGold,
                    ),
                    icon: Icon(
                      playing ? Icons.pause_rounded : Icons.play_arrow_rounded,
                    ),
                  );
                },
              ),
            ],
          ),
          const SizedBox(height: 14),
          StreamBuilder<_PositionData>(
            stream: _positionDataStream,
            builder: (
              BuildContext context,
              AsyncSnapshot<_PositionData> snapshot,
            ) {
              final Duration position =
                  snapshot.data?.position ?? Duration.zero;
              final Duration duration =
                  snapshot.data?.duration ?? Duration.zero;
              final double progress =
                  duration.inMilliseconds <= 0
                      ? 0
                      : (position.inMilliseconds / duration.inMilliseconds)
                          .clamp(0.0, 1.0);

              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  ClipRRect(
                    borderRadius: BorderRadius.circular(999),
                    child: LinearProgressIndicator(
                      value: _ready ? progress : null,
                      minHeight: 4,
                      backgroundColor: StitchTheme.obsidian,
                      color: StitchTheme.adwaGold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: <Widget>[
                      Text(
                        _format(position),
                        style: StitchTheme.body(
                          size: 12,
                          color: StitchTheme.muted,
                        ),
                      ),
                      Text(
                        _loadFailed ? '--:--' : _format(duration),
                        style: StitchTheme.body(
                          size: 12,
                          color: StitchTheme.muted,
                        ),
                      ),
                    ],
                  ),
                  if (widget.transcriptText.trim().isNotEmpty) ...<Widget>[
                    const SizedBox(height: 18),
                    _LiveTranscript(
                      text: widget.transcriptText,
                      progress: progress,
                    ),
                  ],
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

class _LiveTranscript extends StatelessWidget {
  const _LiveTranscript({required this.text, required this.progress});

  final String text;
  final double progress;

  @override
  Widget build(BuildContext context) {
    final List<String> words = text.trim().split(RegExp(r'\s+'));
    final int visibleWordCount =
        words.isEmpty
            ? 0
            : (words.length * progress).ceil().clamp(0, words.length);
    final String spoken = words.take(visibleWordCount).join(' ');
    final String upcoming = words.skip(visibleWordCount).join(' ');

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        const Padding(padding: EdgeInsets.only(top: 3), child: _WaveformMark()),
        const SizedBox(width: 12),
        Expanded(
          child: Text.rich(
            TextSpan(
              children: <InlineSpan>[
                TextSpan(
                  text: spoken.isEmpty ? '' : '$spoken ',
                  style: StitchTheme.body(
                    size: 14,
                    color: StitchTheme.parchment,
                    height: 1.55,
                  ).copyWith(fontStyle: FontStyle.italic),
                ),
                TextSpan(
                  text: upcoming,
                  style: StitchTheme.body(
                    size: 14,
                    color: StitchTheme.muted.withValues(alpha: 0.55),
                    height: 1.55,
                  ).copyWith(fontStyle: FontStyle.italic),
                ),
              ],
            ),
            maxLines: 4,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}

class _WaveformMark extends StatelessWidget {
  const _WaveformMark();

  @override
  Widget build(BuildContext context) {
    const List<double> heights = <double>[8, 16, 11, 20, 13, 17, 8];
    return Semantics(
      label: 'Live transcript',
      child: SizedBox(
        width: 28,
        height: 22,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: heights
              .map(
                (double height) => Container(
                  width: 2,
                  height: height,
                  decoration: BoxDecoration(
                    color: StitchTheme.adwaGold,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              )
              .toList(growable: false),
        ),
      ),
    );
  }
}
