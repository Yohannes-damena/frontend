import 'package:flutter/material.dart';
import 'package:speech_to_text/speech_to_text.dart';

import '../../l10n/app_strings.dart';
import '../../models/chat_args.dart';
import '../../models/chat_message.dart';
import '../../services/api_service.dart';
import '../../services/locale_controller.dart';
import '../../widgets/ai_guide_progress_card.dart';
import '../../widgets/museum_network_image.dart';
import '../../widgets/settings_icon_button.dart';
import 'stitch_theme.dart';

Future<void> showStitchChatSheet(
  BuildContext context, {
  required ChatArgs args,
}) {
  return showModalBottomSheet<void>(
    context: context,
    useRootNavigator: true,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.transparent,
    barrierColor: StitchTheme.ink.withValues(alpha: 0.42),
    builder: (BuildContext sheetContext) {
      return FractionallySizedBox(
        heightFactor: 0.78,
        child: ClipRRect(
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          child: StitchChatScreen(args: args, isSheet: true),
        ),
      );
    },
  );
}

class StitchChatScreen extends StatefulWidget {
  const StitchChatScreen({super.key, required this.args, this.isSheet = false});

  final ChatArgs args;
  final bool isSheet;

  @override
  State<StitchChatScreen> createState() => _StitchChatScreenState();
}

class _StitchChatScreenState extends State<StitchChatScreen> {
  final ApiService _api = ApiService();
  final TextEditingController _questionController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final SpeechToText _speech = SpeechToText();
  final List<_ChatExchange> _exchanges = <_ChatExchange>[];

  bool _sending = false;
  bool _speechReady = false;
  bool _listening = false;

  static const List<String> _suggestions = <String>[
    'Why was this important?',
    'Who was involved?',
    'Tell me a surprising detail',
  ];

  @override
  void initState() {
    super.initState();
    _initSpeech();
  }

  @override
  void dispose() {
    _speech.stop();
    _questionController.dispose();
    _scrollController.dispose();
    _api.dispose();
    super.dispose();
  }

  Future<void> _initSpeech() async {
    final bool available = await _speech.initialize(
      onStatus: (String status) {
        if (!mounted) {
          return;
        }
        final bool listening = status == 'listening';
        if (_listening != listening) {
          setState(() => _listening = listening);
        }
      },
      onError: (_) {
        if (mounted) {
          setState(() => _listening = false);
        }
      },
    );
    if (mounted) {
      setState(() => _speechReady = available);
    }
  }

  Future<void> _toggleListening() async {
    final AppStrings s = AppStrings.of(context);
    if (_sending) {
      return;
    }

    if (_listening) {
      await _speech.stop();
      if (mounted) {
        setState(() => _listening = false);
      }
      return;
    }

    if (!_speechReady) {
      final bool available = await _speech.initialize();
      if (!mounted) {
        return;
      }
      setState(() => _speechReady = available);
      if (!available) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(s.voiceUnavailable)));
        return;
      }
    }

    final String localeId =
        LocaleController.instance.locale.languageCode == 'am'
            ? 'am_ET'
            : 'en_US';

    setState(() => _listening = true);
    await _speech.listen(
      listenOptions: SpeechListenOptions(
        localeId: localeId,
        partialResults: true,
        cancelOnError: true,
        listenMode: ListenMode.confirmation,
      ),
      onResult: (result) {
        if (!mounted) {
          return;
        }
        _questionController.value = TextEditingValue(
          text: result.recognizedWords,
          selection: TextSelection.collapsed(
            offset: result.recognizedWords.length,
          ),
        );
        if (result.finalResult) {
          setState(() => _listening = false);
        }
      },
    );
  }

  Future<void> _sendQuestion([String? suggestedQuestion]) async {
    final String question =
        (suggestedQuestion ?? _questionController.text).trim();
    if (question.isEmpty || _sending) {
      return;
    }

    if (_listening) {
      await _speech.stop();
      if (!mounted) {
        return;
      }
      setState(() => _listening = false);
    }

    FocusScope.of(context).unfocus();
    _questionController.clear();
    setState(() {
      _sending = true;
      _exchanges.add(_ChatExchange(question: question));
    });
    _scrollToBottom();

    try {
      final ChatResponse response = await _api.postChat(
        waypointId: widget.args.waypointId,
        itemId: widget.args.itemId,
        question: question,
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _exchanges[_exchanges.length - 1] = _ChatExchange(
          question: question,
          response: response,
        );
      });
      _scrollToBottom();
    } on ApiException catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _exchanges[_exchanges.length - 1] = _ChatExchange(
          question: question,
          error: error.message,
        );
      });
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() {
        _exchanges[_exchanges.length - 1] = const _ChatExchange(
          question: '',
          error: 'The guide could not answer right now. Please try again.',
        ).copyWith(question: question);
      });
    } finally {
      if (mounted) {
        setState(() => _sending = false);
        _scrollToBottom();
      }
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) {
        return;
      }
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final AppStrings s = AppStrings.of(context);
    final String title =
        widget.args.contextTitle == null
            ? s.chatWithAiGuideTooltip
            : widget.args.contextTitle!;

    return Scaffold(
      backgroundColor: StitchTheme.darkText,
      appBar: AppBar(
        backgroundColor: StitchTheme.darkText,
        foregroundColor: StitchTheme.ink,
        elevation: 0,
        automaticallyImplyLeading: !widget.isSheet,
        leading:
            widget.isSheet
                ? IconButton(
                  tooltip: MaterialLocalizations.of(context).closeButtonTooltip,
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close),
                )
                : null,
        title: Text(
          s.aiGuide,
          style: StitchTheme.overline(color: StitchTheme.ink),
        ),
        actions:
            widget.isSheet
                ? null
                : const <Widget>[SettingsIconButton(color: StitchTheme.ink)],
      ),
      body: Column(
        children: <Widget>[
          Expanded(
            child: ListView(
              controller: _scrollController,
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
              children: <Widget>[
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: StitchTheme.panel,
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(
                      color: StitchTheme.adwaGold.withValues(alpha: 0.28),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      const CircleAvatar(
                        backgroundColor: StitchTheme.adwaGold,
                        foregroundColor: StitchTheme.ink,
                        child: Icon(Icons.auto_awesome_outlined),
                      ),
                      const SizedBox(height: 14),
                      Text(
                        title,
                        style: StitchTheme.headline(
                          size: 27,
                          color: StitchTheme.ink,
                          weight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Ask a question in your own words. The guide answers using the context of this room.',
                        style: StitchTheme.body(
                          size: 15,
                          color: StitchTheme.muted,
                          height: 1.45,
                        ),
                      ),
                    ],
                  ),
                ),
                if (_exchanges.isEmpty) ...<Widget>[
                  const SizedBox(height: 18),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _suggestions
                        .map(
                          (String question) => ActionChip(
                            label: Text(question),
                            onPressed:
                                _sending ? null : () => _sendQuestion(question),
                          ),
                        )
                        .toList(growable: false),
                  ),
                ],
                for (final _ChatExchange exchange in _exchanges)
                  _ExchangeView(exchange: exchange),
                if (_sending)
                  const Padding(
                    padding: EdgeInsets.only(top: 18),
                    child: Row(
                      children: <Widget>[
                        SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: StitchTheme.adwaGold,
                          ),
                        ),
                        SizedBox(width: 12),
                        Text('The guide is thinking…'),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          SafeArea(
            top: false,
            child: Container(
              padding: const EdgeInsets.fromLTRB(16, 12, 12, 12),
              decoration: BoxDecoration(
                color: StitchTheme.panel,
                border: Border(
                  top: BorderSide(
                    color: StitchTheme.muted.withValues(alpha: 0.2),
                  ),
                ),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: <Widget>[
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: <Widget>[
                      Expanded(
                        child: TextField(
                          controller: _questionController,
                          enabled: !_sending,
                          minLines: 1,
                          maxLines: 4,
                          textInputAction: TextInputAction.send,
                          onSubmitted: (_) => _sendQuestion(),
                          style: StitchTheme.body(color: StitchTheme.ink),
                          decoration: InputDecoration(
                            hintText:
                                _listening ? s.listening : s.askPlaceholder,
                            filled: true,
                            fillColor: StitchTheme.darkText,
                            contentPadding: const EdgeInsets.fromLTRB(
                              16,
                              14,
                              8,
                              14,
                            ),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(24),
                              borderSide: BorderSide.none,
                            ),
                            suffixIcon: IconButton(
                              onPressed: _sending ? null : _toggleListening,
                              tooltip: s.voiceInputTooltip,
                              style: IconButton.styleFrom(
                                backgroundColor:
                                    _listening
                                        ? StitchTheme.adwaGold
                                        : StitchTheme.adwaGold.withValues(
                                          alpha: 0.16,
                                        ),
                                foregroundColor:
                                    _listening
                                        ? StitchTheme.ink
                                        : StitchTheme.adwaGold,
                              ),
                              icon: Icon(
                                _listening ? Icons.mic : Icons.mic_none,
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton.filled(
                        onPressed: _sending ? null : _sendQuestion,
                        tooltip: s.send,
                        style: IconButton.styleFrom(
                          backgroundColor: StitchTheme.adwaGold,
                          foregroundColor: StitchTheme.ink,
                        ),
                        icon: const Icon(Icons.arrow_upward),
                      ),
                    ],
                  ),
                  if (_listening) ...<Widget>[
                    const SizedBox(height: 8),
                    Text(
                      s.listening,
                      style: StitchTheme.overline(
                        size: 10,
                        color: StitchTheme.muted,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ExchangeView extends StatelessWidget {
  const _ExchangeView({required this.exchange});

  final _ChatExchange exchange;

  @override
  Widget build(BuildContext context) {
    final ChatResponse? response = exchange.response;
    return Padding(
      padding: const EdgeInsets.only(top: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Align(
            alignment: Alignment.centerRight,
            child: Container(
              constraints: const BoxConstraints(maxWidth: 310),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: StitchTheme.obsidian,
                borderRadius: BorderRadius.circular(18),
              ),
              child: Text(
                exchange.question,
                style: StitchTheme.body(color: StitchTheme.ink, height: 1.4),
              ),
            ),
          ),
          if (exchange.error != null)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Text(
                exchange.error!,
                style: StitchTheme.body(
                  color: StitchTheme.deepRed,
                  height: 1.4,
                ),
              ),
            ),
          if (response != null)
            Container(
              margin: const EdgeInsets.only(top: 12, right: 28),
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: StitchTheme.panel,
                borderRadius: BorderRadius.circular(20),
                boxShadow: <BoxShadow>[
                  BoxShadow(
                    color: StitchTheme.ink.withValues(alpha: 0.07),
                    blurRadius: 18,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  if (response.imageUrl != null) ...<Widget>[
                    ClipRRect(
                      borderRadius: BorderRadius.circular(14),
                      child: AspectRatio(
                        aspectRatio: 16 / 10,
                        child: MuseumNetworkImage(url: response.imageUrl!),
                      ),
                    ),
                    const SizedBox(height: 14),
                  ],
                  _AiGuideAnswerCard(
                    audioUrl: response.audioUrl,
                    transcriptText: response.answer,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    response.answer,
                    style: StitchTheme.body(
                      size: 16,
                      color: StitchTheme.ink,
                      height: 1.55,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _AiGuideAnswerCard extends StatelessWidget {
  const _AiGuideAnswerCard({
    required this.audioUrl,
    required this.transcriptText,
  });

  final String audioUrl;
  final String transcriptText;

  @override
  Widget build(BuildContext context) {
    final AppStrings s = AppStrings.of(context);
    return AiGuideProgressCard(
      audioUrl: audioUrl,
      chapterLabel: s.listenToAnswer,
      transcriptText: transcriptText,
      autoplay: true,
    );
  }
}

class _ChatExchange {
  const _ChatExchange({required this.question, this.response, this.error});

  final String question;
  final ChatResponse? response;
  final String? error;

  _ChatExchange copyWith({String? question}) {
    return _ChatExchange(
      question: question ?? this.question,
      response: response,
      error: error,
    );
  }
}
