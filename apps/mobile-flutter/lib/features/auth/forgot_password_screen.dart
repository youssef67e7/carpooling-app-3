import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers/auth_provider.dart';
import '../../core/theme/weret_tokens.dart';
import '../../core/theme/app_styles.dart';
import '../../core/utils/api_error_message.dart';
import '../../core/utils/auth_validators.dart';
import '../../shared/widgets/otp_input.dart';
import '../../shared/widgets/ui/form_error_callout.dart';

enum _ForgotStep { email, otp, password }

class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});
  static const routePath = '/forgot-password';

  @override
  ConsumerState<ForgotPasswordScreen> createState() =>
      _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState
    extends ConsumerState<ForgotPasswordScreen> {
  static const _xs = 8.0;
  static const _md = 16.0;
  static const _lg = 24.0;
  static const _xl = 32.0;
  static const _cooldownSec = 60;
  static const _transitionMs = 350;
  static const _otpLength = 6;

  _ForgotStep _step = _ForgotStep.email;

  final _email = TextEditingController();
  final _otp = TextEditingController();
  final _password = TextEditingController();
  final _confirmPassword = TextEditingController();

  final _emailFocus = FocusNode();
  final _passwordFocus = FocusNode();
  final _confirmFocus = FocusNode();

  final _emailFormKey = GlobalKey<FormState>();
  final _otpFormKey = GlobalKey<FormState>();
  final _passwordFormKey = GlobalKey<FormState>();

  String? _normalizedEmail;
  int _resendSeconds = 0;
  Timer? _resendTimer;
  bool _sendingOtp = false;
  bool _resettingPassword = false;
  bool _obscurePassword = true;
  bool _obscureConfirm = true;

  String? _localError;
  bool _errorDismissed = false;

  bool get _anyLoading =>
      _sendingOtp || _resettingPassword || ref.read(authProvider).loading;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _emailFocus.requestFocus();
    });
  }

  @override
  void dispose() {
    _resendTimer?.cancel();
    for (final c in [_email, _otp, _password, _confirmPassword]) {
      c.dispose();
    }
    for (final f in [_emailFocus, _passwordFocus, _confirmFocus]) {
      f.dispose();
    }
    super.dispose();
  }

  void _goTo(_ForgotStep next) {
    setState(() {
      _step = next;
      _localError = null;
      _errorDismissed = false;
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final focus = switch (next) {
        _ForgotStep.email => _emailFocus,
        _ForgotStep.password => _passwordFocus,
        _ForgotStep.otp => null,
      };
      focus?.requestFocus();
    });
  }

  void _goBack() {
    if (_anyLoading) return;
    final prev = switch (_step) {
      _ForgotStep.otp => _ForgotStep.email,
      _ForgotStep.password => _ForgotStep.otp,
      _ForgotStep.email => null,
    };
    if (prev != null) {
      if (_step == _ForgotStep.otp) _otp.clear();
      _goTo(prev);
    } else {
      context.pop();
    }
  }

  void _setError(String? e) {
    if (e == null || e.isEmpty) return;
    HapticFeedback.heavyImpact();
    setState(() {
      _localError = e;
      _errorDismissed = false;
    });
  }

  void _dismissError() => setState(() => _errorDismissed = true);

  String? _displayError(String? providerError) {
    if (_errorDismissed) return null;
    return _localError ?? providerError;
  }

  void _startCooldown() {
    _resendTimer?.cancel();
    setState(() => _resendSeconds = _cooldownSec);
    _resendTimer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) {
        t.cancel();
        return;
      }
      setState(() {
        if (_resendSeconds <= 1) {
          t.cancel();
          _resendSeconds = 0;
        } else {
          _resendSeconds--;
        }
      });
    });
  }

  String _maskEmail(String email) {
    final parts = email.split('@');
    if (parts.length != 2 || parts[0].isEmpty) return email;
    final name = parts[0];
    final masked = name.length > 2
        ? '${name[0]}${'*' * (name.length - 2)}${name[name.length - 1]}'
        : '**';
    return '$masked@${parts[1]}';
  }

  Future<void> _sendOtp() async {
    if (_emailFormKey.currentState?.validate() != true) return;
    HapticFeedback.mediumImpact();
    setState(() => _sendingOtp = true);
    ref.read(authProvider.notifier).clearError();
    try {
      final email = _email.text.trim();
      await ref.read(authProvider.notifier).requestPasswordResetOtp(email);
      if (!mounted) return;
      setState(() => _normalizedEmail = email);
      _goTo(_ForgotStep.otp);
      _startCooldown();
    } catch (e) {
      if (mounted) _setError(localizedApiError(e));
    } finally {
      if (mounted) setState(() => _sendingOtp = false);
    }
  }

  void _verifyOtp() {
    if (_otpFormKey.currentState?.validate() != true) return;
    HapticFeedback.mediumImpact();
    _goTo(_ForgotStep.password);
  }

  Future<void> _resetPassword() async {
    if (_passwordFormKey.currentState?.validate() != true) return;
    HapticFeedback.mediumImpact();
    setState(() => _resettingPassword = true);
    ref.read(authProvider.notifier).clearError();
    try {
      await ref.read(authProvider.notifier).resetPasswordWithOtp(
        _normalizedEmail!,
        _otp.text.trim(),
        _password.text.trim(),
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Password reset successfully. Please log in.'),
          ),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) _setError(localizedApiError(e));
    } finally {
      if (mounted) setState(() => _resettingPassword = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);

    return Scaffold(
      backgroundColor: WeretTokens.bg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back_ios_new_rounded,
            size: 20,
            color: WeretTokens.textPrimary,
          ),
          onPressed: _goBack,
        ),
      ),
      body: SafeArea(
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: () => FocusScope.of(context).unfocus(),
          child: LayoutBuilder(
            builder: (context, constraints) {
              return SingleChildScrollView(
                physics: const ClampingScrollPhysics(),
                padding: EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: constraints.maxHeight > 700 ? 0 : _md,
                ),
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: _transitionMs),
                  switchInCurve: Curves.easeOutCubic,
                  switchOutCurve: Curves.easeInCubic,
                  transitionBuilder: (child, animation) {
                    final dir = animation.status == AnimationStatus.reverse
                        ? const Offset(0.06, 0)
                        : const Offset(-0.06, 0);
                    return FadeTransition(
                      opacity: animation,
                      child: SlideTransition(
                        position: Tween(begin: dir, end: Offset.zero)
                            .animate(animation),
                        child: child,
                      ),
                    );
                  },
                  child: KeyedSubtree(
                    key: ValueKey(_step),
                    child: switch (_step) {
                      _ForgotStep.email => _buildEmail(auth.error),
                      _ForgotStep.otp => _buildOtp(auth.error),
                      _ForgotStep.password => _buildPassword(auth.error),
                    },
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildEmail(String? providerError) {
    return Form(
      key: _emailFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: _xl),
          Text('Forgot Password?', style: AppStyles.headlineSmall),
          const SizedBox(height: _xs),
          Text(
            "Enter your email and we'll send you a verification code.",
            style: AppStyles.bodyRegular,
          ),
          const SizedBox(height: _lg),

          if (_displayError(providerError) != null)
            FormErrorCallout(
              message: _displayError(providerError)!,
              onDismiss: _dismissError,
            ),

          _WeretTextField(
            controller: _email,
            focusNode: _emailFocus,
            hint: 'Email address',
            keyboardType: TextInputType.emailAddress,
            validator: validateEmail,
            textInputAction: TextInputAction.done,
            onFieldSubmitted:
                _anyLoading ? null : (_) => _sendOtp(),
            prefixIcon: Icons.mail_outline_rounded,
          ),
          const SizedBox(height: _md),

          _LoginPrimaryButton(
            label: 'Send Code',
            loading: _anyLoading,
            onPressed: _anyLoading ? null : _sendOtp,
          ),
          const SizedBox(height: _md),

          _LoginTextLink(
            label: 'Back to Login',
            onPressed:
                _anyLoading ? null : () => context.pop(),
          ),
        ],
      ),
    );
  }

  Widget _buildOtp(String? providerError) {
    return Form(
      key: _otpFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: _xl),
          Text('Enter verification code', style: AppStyles.headlineSmall),
          if (_normalizedEmail != null) ...[
            const SizedBox(height: _xs),
            RichText(
              text: TextSpan(
                style: AppStyles.bodyRegular,
                children: [
                  const TextSpan(text: 'Sent to '),
                  TextSpan(
                    text: _maskEmail(_normalizedEmail!),
                    style: AppStyles.bodyRegular
                        .copyWith(fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: _lg),

          if (_displayError(providerError) != null)
            FormErrorCallout(
              message: _displayError(providerError)!,
              onDismiss: _dismissError,
            ),

          OtpInput(
            length: _otpLength,
            onCompleted: (code) {
              _otp.text = code;
              if (!_anyLoading) _verifyOtp();
            },
          ),
          const SizedBox(height: _md),

          _LoginPrimaryButton(
            label: 'Verify',
            loading: false,
            onPressed: _anyLoading ? null : _verifyOtp,
          ),
          const SizedBox(height: _md),

          _LoginTextLink(
            label: _resendSeconds > 0
                ? 'Resend in ${_resendSeconds}s'
                : 'Resend code',
            onPressed:
                (_resendSeconds > 0 || _anyLoading) ? null : _sendOtp,
          ),
          _LoginTextLink(
            label: 'Change email address',
            onPressed:
                _anyLoading ? null : () => _goTo(_ForgotStep.email),
          ),
        ],
      ),
    );
  }

  Widget _buildPassword(String? providerError) {
    return Form(
      key: _passwordFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: _xl),
          Text('Create new password', style: AppStyles.headlineSmall),
          const SizedBox(height: _xs),
          Text(
            'Your new password must be different from previous used passwords.',
            style: AppStyles.bodyRegular,
          ),
          const SizedBox(height: _lg),

          if (_displayError(providerError) != null)
            FormErrorCallout(
              message: _displayError(providerError)!,
              onDismiss: _dismissError,
            ),

          _WeretTextField(
            controller: _password,
            focusNode: _passwordFocus,
            hint: 'New password',
            obscureText: _obscurePassword,
            validator: validatePassword,
            textInputAction: TextInputAction.next,
            onFieldSubmitted: (_) => _confirmFocus.requestFocus(),
            prefixIcon: Icons.lock_outline_rounded,
            suffixIcon: _PasswordToggle(
              obscured: _obscurePassword,
              onToggle: () =>
                  setState(() => _obscurePassword = !_obscurePassword),
            ),
          ),
          const SizedBox(height: _md),

          _WeretTextField(
            controller: _confirmPassword,
            focusNode: _confirmFocus,
            hint: 'Confirm password',
            obscureText: _obscureConfirm,
            validator: (v) {
              if (v == null || v.isEmpty) return 'Please confirm your password';
              if (v != _password.text) return 'Passwords do not match';
              return null;
            },
            textInputAction: TextInputAction.done,
            onFieldSubmitted:
                _anyLoading ? null : (_) => _resetPassword(),
            prefixIcon: Icons.lock_outline_rounded,
            suffixIcon: _PasswordToggle(
              obscured: _obscureConfirm,
              onToggle: () =>
                  setState(() => _obscureConfirm = !_obscureConfirm),
            ),
          ),
          const SizedBox(height: _md),

          _LoginPrimaryButton(
            label: 'Reset Password',
            loading: _anyLoading,
            onPressed: _anyLoading ? null : _resetPassword,
          ),
          const SizedBox(height: _md),

          _LoginTextLink(
            label: 'Back to Login',
            onPressed:
                _anyLoading ? null : () => context.pop(),
          ),
        ],
      ),
    );
  }
}

class _LoginPrimaryButton extends StatelessWidget {
  final String label;
  final bool loading;
  final VoidCallback? onPressed;
  const _LoginPrimaryButton({
    required this.label,
    this.loading = false,
    this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 55,
      child: AnimatedOpacity(
        duration: const Duration(milliseconds: 150),
        opacity: (onPressed == null && !loading) ? 0.5 : 1.0,
        child: FilledButton(
          onPressed: onPressed,
          style: FilledButton.styleFrom(
            backgroundColor: WeretTokens.brand,
            foregroundColor: Colors.white,
            disabledBackgroundColor: WeretTokens.brand,
            disabledForegroundColor: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            textStyle: const TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 16,
            ),
          ),
          child: loading
              ? const SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.5,
                    color: Colors.white,
                  ),
                )
              : Text(label),
        ),
      ),
    );
  }
}

class _LoginTextLink extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  const _LoginTextLink({required this.label, this.onPressed});

  @override
  Widget build(BuildContext context) {
    return TextButton(
      onPressed: onPressed,
      style: TextButton.styleFrom(
        minimumSize: const Size.fromHeight(36),
        padding: const EdgeInsets.symmetric(horizontal: 4),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: onPressed != null
              ? WeretTokens.textSecondary
              : WeretTokens.textMuted,
          fontWeight: FontWeight.w600,
          fontSize: 14,
        ),
      ),
    );
  }
}

class _PasswordToggle extends StatelessWidget {
  final bool obscured;
  final VoidCallback onToggle;
  const _PasswordToggle({required this.obscured, required this.onToggle});

  @override
  Widget build(BuildContext context) {
    return IconButton(
      icon: Icon(
        obscured
            ? Icons.visibility_off_outlined
            : Icons.visibility_outlined,
        size: 20,
        color: WeretTokens.textMuted,
      ),
      padding: const EdgeInsets.only(right: 4),
      constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
      onPressed: onToggle,
    );
  }
}

class _WeretTextField extends StatelessWidget {
  final TextEditingController controller;
  final FocusNode? focusNode;
  final String? hint;
  final bool obscureText;
  final TextInputType? keyboardType;
  final String? Function(String?)? validator;
  final TextInputAction? textInputAction;
  final void Function(String)? onFieldSubmitted;
  final IconData? prefixIcon;
  final Widget? suffixIcon;

  static final _border = OutlineInputBorder(
    borderRadius: BorderRadius.circular(12),
    borderSide: const BorderSide(color: WeretTokens.borderSubtle),
  );
  static final _focusedBorder = OutlineInputBorder(
    borderRadius: BorderRadius.circular(12),
    borderSide: const BorderSide(color: WeretTokens.brand, width: 1.5),
  );
  static final _errorBorder = OutlineInputBorder(
    borderRadius: BorderRadius.circular(12),
    borderSide: BorderSide(color: Colors.red.shade300),
  );

  const _WeretTextField({
    required this.controller,
    this.focusNode,
    this.hint,
    this.obscureText = false,
    this.keyboardType,
    this.validator,
    this.textInputAction,
    this.onFieldSubmitted,
    this.prefixIcon,
    this.suffixIcon,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 50,
      child: TextFormField(
        controller: controller,
        focusNode: focusNode,
        obscureText: obscureText,
        keyboardType: keyboardType,
        validator: validator,
        textInputAction: textInputAction,
        onFieldSubmitted: onFieldSubmitted,
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: const TextStyle(
            color: WeretTokens.textMuted,
            fontSize: 14,
          ),
          filled: true,
          fillColor: WeretTokens.inputFill,
          prefixIcon: prefixIcon != null
              ? Icon(prefixIcon, size: 20, color: WeretTokens.textMuted)
              : null,
          suffixIcon: suffixIcon,
          border: _border,
          enabledBorder: _border,
          focusedBorder: _focusedBorder,
          errorBorder: _errorBorder,
          focusedErrorBorder: _errorBorder.copyWith(
            borderSide: BorderSide(color: Colors.red.shade400, width: 1.5),
          ),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 14,
          ),
          errorStyle: const TextStyle(height: 0, fontSize: 0),
        ),
      ),
    );
  }
}
