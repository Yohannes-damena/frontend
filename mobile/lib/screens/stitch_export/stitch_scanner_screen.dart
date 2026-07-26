import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../l10n/app_strings.dart';
import '../../models/room.dart';
import '../../services/api_service.dart';
import '../../services/ticket_gate.dart';
import '../../widgets/settings_icon_button.dart';
import 'stitch_routes.dart';
import 'stitch_theme.dart';

/// Scan tab — camera QR reader.
///
/// The scanned value is the room id. We call [ApiService.getWaypoint]
/// directly, then run the one-time-per-museum ticket gate before opening
/// the Room screen.
class StitchScannerScreen extends StatefulWidget {
  const StitchScannerScreen({super.key, this.showBottomNav = true});

  final bool showBottomNav;

  @override
  State<StitchScannerScreen> createState() => _StitchScannerScreenState();
}

class _StitchScannerScreenState extends State<StitchScannerScreen>
    with WidgetsBindingObserver {
  final ApiService _api = ApiService();
  final MobileScannerController _controller = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    facing: CameraFacing.back,
    formats: const <BarcodeFormat>[BarcodeFormat.qrCode],
  );

  bool _isProcessing = false;
  String? _statusMessage;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _controller.dispose();
    _api.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Avoid restarting the camera while permission is denied — that can
    // re-trigger the system permission dialog in a loop.
    if (!_controller.value.hasCameraPermission) {
      return;
    }
    if (state == AppLifecycleState.resumed) {
      if (!_isProcessing) {
        _controller.start();
      }
      return;
    }
    _controller.stop();
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (_isProcessing || !mounted) {
      return;
    }

    final List<String> codes = capture.barcodes
        .map((Barcode b) => b.rawValue?.trim())
        .whereType<String>()
        .where((String v) => v.isNotEmpty)
        .toList(growable: false);

    if (codes.isEmpty) {
      final AppStrings s = AppStrings.of(context);
      setState(() {
        _statusMessage = s.scanWaiting;
      });
      return;
    }

    final String raw = codes.first;
    final AppStrings s = AppStrings.of(context);

    setState(() {
      _isProcessing = true;
      _statusMessage = s.scanningOpeningRoom;
    });

    try {
      await _controller.stop();
    } catch (_) {
      // Camera may already be stopped.
    }

    try {
      final Room room = await _api.getWaypoint(raw);
      if (!mounted) {
        return;
      }

      final bool granted = await TicketGate.ensureAccess(context, room: room);
      if (!mounted || !granted) {
        return;
      }

      await Navigator.pushNamed(context, StitchRoutes.room, arguments: room);
    } on ApiException catch (e) {
      if (!mounted) {
        return;
      }
      final String message = switch (e.code) {
        'NOT_FOUND' => 'Unknown room QR. This code is not in the tour.',
        'HTTP_404' => 'Unknown room QR. This code is not in the tour.',
        'TIMEOUT' => 'Network problem. Check your connection and try again.',
        'NETWORK_ERROR' =>
          'Network problem. Check your connection and try again.',
        _ => e.message,
      };
      setState(() => _statusMessage = message);
      _showErrorSnack(message);
    } catch (_) {
      if (!mounted) {
        return;
      }
      const String message =
          'Something went wrong while opening this room. Try again.';
      setState(() => _statusMessage = message);
      _showErrorSnack(message);
    } finally {
      if (mounted) {
        setState(() => _isProcessing = false);
        if (_controller.value.hasCameraPermission) {
          await _controller.start();
        }
      }
    }
  }

  void _showErrorSnack(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: StitchTheme.panel,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Widget _permissionDeniedView() {
    final AppStrings s = AppStrings.of(context);
    return Container(
      color: StitchTheme.darkText,
      alignment: Alignment.center,
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: <Widget>[
          const Icon(
            Icons.no_photography_outlined,
            size: 64,
            color: StitchTheme.muted,
          ),
          const SizedBox(height: 20),
          Text(
            s.cameraPermissionTitle,
            textAlign: TextAlign.center,
            style: StitchTheme.headline(size: 28, color: StitchTheme.parchment),
          ),
          const SizedBox(height: 12),
          Text(
            s.cameraPermissionBody,
            textAlign: TextAlign.center,
            style: StitchTheme.body(
              size: 16,
              color: StitchTheme.muted,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _cameraErrorView(MobileScannerException error) {
    if (error.errorCode == MobileScannerErrorCode.permissionDenied) {
      return _permissionDeniedView();
    }

    final String message = switch (error.errorCode) {
      MobileScannerErrorCode.unsupported =>
        'This device does not support camera scanning.',
      _ => 'Camera error. Close the app and try again.',
    };

    return Container(
      color: StitchTheme.darkText,
      alignment: Alignment.center,
      padding: const EdgeInsets.all(32),
      child: Text(
        message,
        textAlign: TextAlign.center,
        style: StitchTheme.body(size: 16, color: StitchTheme.muted),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final AppStrings s = AppStrings.of(context);

    return Scaffold(
      backgroundColor: StitchTheme.darkText,
      body: Stack(
        fit: StackFit.expand,
        children: <Widget>[
          MobileScanner(
            controller: _controller,
            onDetect: _onDetect,
            errorBuilder: (BuildContext context, MobileScannerException error) {
              return _cameraErrorView(error);
            },
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 8, 24),
              child: Column(
                children: <Widget>[
                  Row(
                    children: <Widget>[
                      Expanded(
                        child: Text(
                          s.scan,
                          style: StitchTheme.headline(
                            size: 28,
                            color: StitchTheme.heroText,
                            letterSpacing: 1.2,
                          ),
                        ),
                      ),
                      const SettingsIconButton(color: StitchTheme.heroText),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    s.scanHeaderHint,
                    style: StitchTheme.overline(
                      size: 11,
                      color: StitchTheme.heroText,
                    ),
                  ),
                  const Spacer(),
                  Container(
                    width: 260,
                    height: 260,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(
                        color: StitchTheme.heroText.withValues(alpha: 0.72),
                        width: 2,
                      ),
                    ),
                  ),
                  const Spacer(),
                  Container(
                    width: double.infinity,
                    margin: const EdgeInsets.symmetric(horizontal: 8),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 18,
                      vertical: 14,
                    ),
                    decoration: BoxDecoration(
                      color: StitchTheme.panel,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Text(
                      _isProcessing
                          ? s.scanningOpeningRoom
                          : (_statusMessage ?? s.scanWaiting),
                      textAlign: TextAlign.center,
                      style: StitchTheme.body(
                        size: 15,
                        color: StitchTheme.muted,
                        height: 1.4,
                      ),
                    ),
                  ),
                  if (widget.showBottomNav) const SizedBox(height: 88),
                ],
              ),
            ),
          ),
          if (_isProcessing)
            ColoredBox(
              color: Colors.black.withValues(alpha: 0.45),
              child: const Center(
                child: CircularProgressIndicator(color: StitchTheme.adwaGold),
              ),
            ),
        ],
      ),
      bottomNavigationBar:
          widget.showBottomNav ? const StitchBottomNav(activeIndex: 1) : null,
    );
  }
}
