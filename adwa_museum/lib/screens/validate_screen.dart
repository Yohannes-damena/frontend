import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme.dart';

/// Ticket validation screen — QR scan + OTP entry tabs.
///
/// Converted from validate.tsx. Provides two parallel auth methods
/// (scan QR code or enter a 6-digit OTP) as equal-weight tabs.
class ValidateScreen extends StatefulWidget {
  const ValidateScreen({super.key});

  @override
  State<ValidateScreen> createState() => _ValidateScreenState();
}

class _ValidateScreenState extends State<ValidateScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          color: AppColors.darkGray,
          gradient: RadialGradient(
            center: const Alignment(0.0, -0.2),
            radius: 0.8,
            colors: [
              AppColors.ember.withValues(alpha: 0.18),
              Colors.transparent,
            ],
          ),
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 24),

                // ── Header bar ──
                _Header(),

                const SizedBox(height: 40),

                // ── Title ──
                Text(
                  'Validate\nAccess',
                  style: AppTheme.display(
                    fontSize: 48,
                    fontWeight: FontWeight.w700,
                    height: 1.05,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'Present your digital or physical ticket for gallery entry.',
                  style: AppTheme.ui(
                    fontSize: 16,
                    color: AppColors.parchment.withValues(alpha: 0.7),
                  ),
                ),

                const SizedBox(height: 32),

                // ── Glassmorphic panel ──
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppColors.panelDark.withValues(alpha: 0.7),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(
                      color: AppColors.white.withValues(alpha: 0.05),
                    ),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x66000000),
                        blurRadius: 60,
                        offset: Offset(0, 20),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      // Tab toggle
                      _TabToggle(controller: _tabController),
                      const SizedBox(height: 16),

                      // Tab content
                      AnimatedBuilder(
                        animation: _tabController,
                        builder: (_, __) {
                          return AnimatedSwitcher(
                            duration: const Duration(milliseconds: 250),
                            child:
                                _tabController.index == 0
                                    ? _QrPanel(key: const ValueKey('qr'))
                                    : _OtpPanel(key: const ValueKey('otp')),
                          );
                        },
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 40),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ── Header ──────────────────────────────────────────────────────────────

class _Header extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        // Avatar placeholder
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: const Color(0xFF2A2A2A),
            border: Border.all(
              color: AppColors.parchment.withValues(alpha: 0.2),
            ),
          ),
        ),
        Text(
          'THE GALLERY',
          style: AppTheme.display(
            fontSize: 14,
            fontWeight: FontWeight.w400,
            color: AppColors.parchment.withValues(alpha: 0.9),
            letterSpacing: 4,
          ),
        ),
        Icon(
          Icons.send_outlined,
          size: 20,
          color: AppColors.parchment.withValues(alpha: 0.8),
        ),
      ],
    );
  }
}

// ── Tab toggle ──────────────────────────────────────────────────────────

class _TabToggle extends StatelessWidget {
  const _TabToggle({required this.controller});
  final TabController controller;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(100),
      ),
      child: TabBar(
        controller: controller,
        indicatorSize: TabBarIndicatorSize.tab,
        indicator: BoxDecoration(
          color: AppColors.gold,
          borderRadius: BorderRadius.circular(100),
        ),
        dividerColor: Colors.transparent,
        labelColor: AppColors.ink,
        unselectedLabelColor: AppColors.parchment.withValues(alpha: 0.7),
        labelStyle: AppTheme.ui(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          letterSpacing: 2,
        ),
        unselectedLabelStyle: AppTheme.ui(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          letterSpacing: 2,
        ),
        tabs: const [Tab(text: 'SCAN QR'), Tab(text: 'ENTER OTP')],
      ),
    );
  }
}

// ── QR scan panel ───────────────────────────────────────────────────────

class _QrPanel extends StatefulWidget {
  const _QrPanel({super.key});

  @override
  State<_QrPanel> createState() => _QrPanelState();
}

class _QrPanelState extends State<_QrPanel>
    with SingleTickerProviderStateMixin {
  final _codeController = TextEditingController();
  String? _error;
  late final AnimationController _scanController;

  @override
  void initState() {
    super.initState();
    _scanController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2400),
    )..repeat();
  }

  @override
  void dispose() {
    _codeController.dispose();
    _scanController.dispose();
    super.dispose();
  }

  void _submit() {
    final code = _codeController.text.trim();
    if (code.isEmpty) {
      // Simulate scanner success
      Navigator.pushNamed(context, '/affirmation');
      return;
    }
    if (code.length < 4) {
      setState(() => _error = 'Invalid ticket. Please try again.');
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted) setState(() => _error = null);
      });
      return;
    }
    Navigator.pushNamed(context, '/affirmation');
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Viewfinder
        AspectRatio(
          aspectRatio: 1,
          child: Container(
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.3),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color:
                    _error != null
                        ? AppColors.deepRed
                        : AppColors.parchment.withValues(alpha: 0.25),
                width: 2,
                strokeAlign: BorderSide.strokeAlignInside,
              ),
            ),
            child: Stack(
              children: [
                // Center icon + text
                Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.qr_code_2,
                        size: 56,
                        color: AppColors.parchment.withValues(alpha: 0.5),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'AWAITING SCAN',
                        style: AppTheme.ui(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 3,
                          color: AppColors.parchment.withValues(alpha: 0.5),
                        ),
                      ),
                    ],
                  ),
                ),

                // Corner brackets
                ..._buildCornerBrackets(),

                // Animated scan sweep
                AnimatedBuilder(
                  animation: _scanController,
                  builder: (_, __) {
                    return Positioned(
                      left: 24,
                      right: 24,
                      top:
                          _scanController.value *
                          (MediaQuery.of(context).size.width - 40 - 48),
                      child: Container(
                        height: 2,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              Colors.transparent,
                              AppColors.gold.withValues(alpha: 0.6),
                              Colors.transparent,
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        ),

        const SizedBox(height: 24),

        // "Or enter manually" divider
        Row(
          children: [
            Expanded(
              child: Container(
                height: 1,
                color: AppColors.parchment.withValues(alpha: 0.15),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Text(
                'OR ENTER MANUALLY',
                style: AppTheme.ui(
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 3,
                  color: AppColors.parchment.withValues(alpha: 0.5),
                ),
              ),
            ),
            Expanded(
              child: Container(
                height: 1,
                color: AppColors.parchment.withValues(alpha: 0.15),
              ),
            ),
          ],
        ),

        const SizedBox(height: 20),

        // Ticket code label
        Align(
          alignment: Alignment.centerLeft,
          child: Text(
            'TICKET CODE',
            style: AppTheme.ui(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              letterSpacing: 2.5,
              color: AppColors.parchment.withValues(alpha: 0.7),
            ),
          ),
        ),
        const SizedBox(height: 8),

        // Code input
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: 0.3),
            borderRadius: BorderRadius.circular(100),
            border: Border.all(color: AppColors.white.withValues(alpha: 0.1)),
          ),
          child: Row(
            children: [
              Icon(
                Icons.confirmation_number_outlined,
                size: 16,
                color: AppColors.parchment.withValues(alpha: 0.5),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextField(
                  controller: _codeController,
                  style: AppTheme.ui(fontSize: 14, color: AppColors.parchment),
                  decoration: InputDecoration(
                    isDense: true,
                    contentPadding: EdgeInsets.zero,
                    border: InputBorder.none,
                    hintText: 'e.g. GLRY-2024-XXXX',
                    hintStyle: AppTheme.ui(
                      fontSize: 14,
                      color: AppColors.parchment.withValues(alpha: 0.4),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),

        // Error toast
        if (_error != null) ...[
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: AppColors.deepRed.withValues(alpha: 0.9),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              _error!,
              textAlign: TextAlign.center,
              style: AppTheme.ui(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: AppColors.white,
              ),
            ),
          ),
        ],

        const SizedBox(height: 24),

        // Submit button
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _submit,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.gold,
              foregroundColor: AppColors.ink,
              padding: const EdgeInsets.symmetric(vertical: 18),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(100),
              ),
              elevation: 0,
            ),
            child: Text(
              '· ACTIVATE SCANNER',
              style: AppTheme.ui(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                letterSpacing: 2,
                color: AppColors.ink,
              ),
            ),
          ),
        ),
      ],
    );
  }

  List<Widget> _buildCornerBrackets() {
    const size = 24.0;
    const offset = 12.0;
    const color = AppColors.gold;
    const width = 2.0;

    return [
      // Top-left
      Positioned(
        left: offset,
        top: offset,
        child: Container(
          width: size,
          height: size,
          decoration: const BoxDecoration(
            border: Border(
              left: BorderSide(color: color, width: width),
              top: BorderSide(color: color, width: width),
            ),
          ),
        ),
      ),
      // Top-right
      Positioned(
        right: offset,
        top: offset,
        child: Container(
          width: size,
          height: size,
          decoration: const BoxDecoration(
            border: Border(
              right: BorderSide(color: color, width: width),
              top: BorderSide(color: color, width: width),
            ),
          ),
        ),
      ),
      // Bottom-left
      Positioned(
        left: offset,
        bottom: offset,
        child: Container(
          width: size,
          height: size,
          decoration: const BoxDecoration(
            border: Border(
              left: BorderSide(color: color, width: width),
              bottom: BorderSide(color: color, width: width),
            ),
          ),
        ),
      ),
      // Bottom-right
      Positioned(
        right: offset,
        bottom: offset,
        child: Container(
          width: size,
          height: size,
          decoration: const BoxDecoration(
            border: Border(
              right: BorderSide(color: color, width: width),
              bottom: BorderSide(color: color, width: width),
            ),
          ),
        ),
      ),
    ];
  }
}

// ── OTP panel ───────────────────────────────────────────────────────────

class _OtpPanel extends StatefulWidget {
  const _OtpPanel({super.key});

  @override
  State<_OtpPanel> createState() => _OtpPanelState();
}

class _OtpPanelState extends State<_OtpPanel> {
  final _phoneController = TextEditingController();
  final List<TextEditingController> _otpControllers = List.generate(
    6,
    (_) => TextEditingController(),
  );
  final List<FocusNode> _otpFocusNodes = List.generate(6, (_) => FocusNode());
  int _cooldown = 0;
  Timer? _cooldownTimer;

  @override
  void dispose() {
    _phoneController.dispose();
    for (final c in _otpControllers) {
      c.dispose();
    }
    for (final f in _otpFocusNodes) {
      f.dispose();
    }
    _cooldownTimer?.cancel();
    super.dispose();
  }

  void _startCooldown() {
    setState(() => _cooldown = 60);
    _cooldownTimer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_cooldown <= 1) {
        t.cancel();
      }
      if (mounted) setState(() => _cooldown--);
    });
  }

  void _onOtpChanged(int index, String value) {
    if (value.length == 1 && index < 5) {
      _otpFocusNodes[index + 1].requestFocus();
    }
    // Check if all digits filled → auto-submit
    if (_otpControllers.every((c) => c.text.isNotEmpty)) {
      Navigator.pushNamed(context, '/affirmation');
    }
  }

  void _onOtpKeyEvent(int index, KeyEvent event) {
    if (event is KeyDownEvent &&
        event.logicalKey == LogicalKeyboardKey.backspace &&
        _otpControllers[index].text.isEmpty &&
        index > 0) {
      _otpFocusNodes[index - 1].requestFocus();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Phone label
          Text(
            'REGISTERED MOBILE',
            style: AppTheme.ui(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              letterSpacing: 2.5,
              color: AppColors.parchment.withValues(alpha: 0.7),
            ),
          ),
          const SizedBox(height: 8),

          // Phone input row
          Container(
            padding: const EdgeInsets.only(bottom: 8),
            decoration: BoxDecoration(
              border: Border(
                bottom: BorderSide(
                  color: AppColors.parchment.withValues(alpha: 0.25),
                ),
              ),
            ),
            child: Row(
              children: [
                Text(
                  '+91',
                  style: AppTheme.ui(
                    fontSize: 14,
                    color: AppColors.parchment.withValues(alpha: 0.8),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: _phoneController,
                    keyboardType: TextInputType.phone,
                    style: AppTheme.ui(
                      fontSize: 14,
                      color: AppColors.parchment,
                    ),
                    decoration: InputDecoration(
                      isDense: true,
                      contentPadding: EdgeInsets.zero,
                      border: InputBorder.none,
                      hintText: 'Registered mobile number',
                      hintStyle: AppTheme.ui(
                        fontSize: 14,
                        color: AppColors.parchment.withValues(alpha: 0.3),
                      ),
                    ),
                  ),
                ),
                GestureDetector(
                  onTap:
                      _phoneController.text.length >= 6 && _cooldown <= 0
                          ? _startCooldown
                          : null,
                  child: Text(
                    _cooldown > 0 ? '${_cooldown}s' : 'SEND CODE',
                    style: AppTheme.ui(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 2,
                      color:
                          _phoneController.text.length >= 6 && _cooldown <= 0
                              ? AppColors.gold
                              : AppColors.gold.withValues(alpha: 0.3),
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 32),

          // OTP digit inputs
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: List.generate(6, (i) {
              return SizedBox(
                width: 44,
                height: 56,
                child: KeyboardListener(
                  focusNode: FocusNode(),
                  onKeyEvent: (event) => _onOtpKeyEvent(i, event),
                  child: TextField(
                    controller: _otpControllers[i],
                    focusNode: _otpFocusNodes[i],
                    keyboardType: TextInputType.number,
                    textAlign: TextAlign.center,
                    maxLength: 1,
                    onChanged: (v) => _onOtpChanged(i, v),
                    style: AppTheme.display(
                      fontSize: 24,
                      fontWeight: FontWeight.w600,
                      color: AppColors.parchment,
                    ),
                    decoration: InputDecoration(
                      counterText: '',
                      contentPadding: const EdgeInsets.symmetric(vertical: 12),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(
                          color:
                              _otpControllers[i].text.isNotEmpty
                                  ? AppColors.gold
                                  : AppColors.white.withValues(alpha: 0.2),
                        ),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: const BorderSide(
                          color: AppColors.gold,
                          width: 2,
                        ),
                      ),
                      filled: true,
                      fillColor: Colors.black.withValues(alpha: 0.3),
                    ),
                  ),
                ),
              );
            }),
          ),

          const SizedBox(height: 24),

          // Resend link
          Center(
            child: RichText(
              text: TextSpan(
                style: AppTheme.ui(
                  fontSize: 12,
                  color: AppColors.parchment.withValues(alpha: 0.5),
                ),
                children: [
                  const TextSpan(text: "Didn't receive a code? "),
                  TextSpan(
                    text: 'Resend',
                    style: AppTheme.ui(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppColors.gold,
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
