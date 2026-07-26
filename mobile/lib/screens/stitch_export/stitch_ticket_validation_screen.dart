import 'package:flutter/material.dart';

import '../../l10n/app_strings.dart';
import '../../models/ticket_validation_args.dart';
import '../../services/api_service.dart';
import '../../services/ticket_access_store.dart';
import '../../widgets/museum_network_image.dart';
import 'stitch_theme.dart';

/// One-time-per-museum entry gate via `POST /tickets/validate`.
///
/// Shown only when [TicketAccessStore] has no fresh grant for the room's museum
/// scope. On success, pops `true` so the caller can open the pending room.
///
/// DESIGN_SYSTEM v2: solid panels only (no glass), gold only on the primary
/// CTA, Adwa-focused copy — no gallery-template branding.
class StitchTicketValidationScreen extends StatefulWidget {
  const StitchTicketValidationScreen({super.key, required this.args});

  final TicketValidationArgs args;

  @override
  State<StitchTicketValidationScreen> createState() =>
      _StitchTicketValidationScreenState();
}

class _StitchTicketValidationScreenState
    extends State<StitchTicketValidationScreen> {
  final ApiService _api = ApiService();
  final TextEditingController _ticketController = TextEditingController();
  final FocusNode _focusNode = FocusNode();

  bool _submitting = false;
  String? _errorMessage;

  String get _waypointId => widget.args.continueTo.id;

  @override
  void dispose() {
    _ticketController.dispose();
    _focusNode.dispose();
    _api.dispose();
    super.dispose();
  }

  Future<void> _validateTicket() async {
    final AppStrings s = AppStrings.of(context);
    final String code = _ticketController.text.trim();
    if (code.isEmpty) {
      setState(() {
        _errorMessage = s.enterTicketCode;
      });
      return;
    }

    setState(() {
      _submitting = true;
      _errorMessage = null;
    });

    try {
      final result = await _api.validateTicket(
        waypointId: _waypointId,
        ticketCode: code,
      );

      if (!mounted) {
        return;
      }

      // Cache against the scope the server just reported, falling back to the
      // one the waypoint carried, so the grant covers the whole museum.
      final String scope = result.museumScope.trim().isNotEmpty
          ? result.museumScope
          : widget.args.continueTo.museumScope;

      // Museum does not require tickets — skip permanently without writing a
      // 24-hour validation timestamp.
      if (!result.ticketRequired) {
        await TicketAccessStore.markTicketNotRequired(scope);
        if (!mounted) {
          return;
        }
        Navigator.pop(context, true);
        return;
      }

      if (result.valid) {
        await TicketAccessStore.markValidated(scope);
        if (!mounted) {
          return;
        }
        Navigator.pop(context, true);
        return;
      }

      setState(() {
        _errorMessage = s.ticketInvalid;
      });
    } on ApiException catch (e) {
      if (!mounted) {
        return;
      }
      setState(() {
        _errorMessage = e.message;
      });
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() {
        _errorMessage = AppStrings.of(context).ticketValidateFailed;
      });
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final AppStrings s = AppStrings.of(context);

    return Scaffold(
      backgroundColor: StitchTheme.darkText,
      appBar: AppBar(
        backgroundColor: StitchTheme.darkText,
        foregroundColor: StitchTheme.ink,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.pop(context, false),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              Text(
                s.entry,
                textAlign: TextAlign.center,
                style: StitchTheme.overline(size: 12, color: StitchTheme.muted),
              ),
              const SizedBox(height: 28),
              Text(
                s.validateTicketTitle,
                textAlign: TextAlign.center,
                style: StitchTheme.headline(
                  size: 34,
                  color: StitchTheme.parchment,
                  height: 1.1,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                s.validateTicketBody,
                textAlign: TextAlign.center,
                style: StitchTheme.body(
                  size: 16,
                  color: StitchTheme.muted,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 32),
              Container(
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  color: StitchTheme.panel,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: <Widget>[
                    ClipRRect(
                      borderRadius: BorderRadius.circular(14),
                      child: AspectRatio(
                        aspectRatio: 16 / 10,
                        child: MuseumNetworkImage(
                          url:
                              widget.args.continueTo.items.isNotEmpty
                                  ? widget.args.continueTo.items.first.imageUrl
                                  : 'assets/images/room1/hero.png',
                          fit: BoxFit.cover,
                          fallback: const ColoredBox(
                            color: StitchTheme.obsidian,
                            child: Center(
                              child: Icon(
                                Icons.account_balance_outlined,
                                color: StitchTheme.muted,
                                size: 48,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 22),
                    Text(
                      s.ticketCode,
                      style: StitchTheme.overline(
                        size: 11,
                        color: StitchTheme.muted,
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _ticketController,
                      focusNode: _focusNode,
                      textCapitalization: TextCapitalization.characters,
                      enabled: !_submitting,
                      style: StitchTheme.body(
                        size: 16,
                        color: StitchTheme.parchment,
                      ),
                      onSubmitted: (_) => _validateTicket(),
                      decoration: InputDecoration(
                        hintText: 'e.g. ADWA-1896',
                        hintStyle: StitchTheme.body(
                          size: 16,
                          color: StitchTheme.muted,
                        ),
                        prefixIcon: const Icon(
                          Icons.confirmation_number_outlined,
                          color: StitchTheme.muted,
                        ),
                        filled: true,
                        fillColor: StitchTheme.obsidian,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(999),
                          borderSide: BorderSide.none,
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 18,
                          vertical: 16,
                        ),
                      ),
                    ),
                    if (_errorMessage != null) ...<Widget>[
                      const SizedBox(height: 14),
                      Text(
                        _errorMessage!,
                        style: StitchTheme.body(
                          size: 14,
                          color: const Color(0xFF7F1425),
                          height: 1.4,
                        ),
                      ),
                    ],
                    const SizedBox(height: 18),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed: _submitting ? null : _validateTicket,
                        style: FilledButton.styleFrom(
                          backgroundColor: StitchTheme.adwaGold,
                          foregroundColor: StitchTheme.ink,
                          disabledBackgroundColor: StitchTheme.adwaGold
                              .withValues(alpha: 0.45),
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(999),
                          ),
                        ),
                        child:
                            _submitting
                                ? const SizedBox(
                                  width: 22,
                                  height: 22,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: StitchTheme.ink,
                                  ),
                                )
                                : Text(
                                  s.validateTicket,
                                  style: StitchTheme.body(
                                    size: 16,
                                    weight: FontWeight.w700,
                                    color: StitchTheme.ink,
                                  ),
                                ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
