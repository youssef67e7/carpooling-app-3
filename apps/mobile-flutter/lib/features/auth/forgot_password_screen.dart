import 'dart:async';

import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/utils/api_error_message.dart';
import '../../core/utils/auth_validators.dart';
import '../../shared/widgets/auth_form_field.dart';
import '../../shared/widgets/custom_button.dart';
import '../../shared/widgets/weret_auth_scaffold.dart';

class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  String _step = 'email';
  final _email = TextEditingController();
  final _otp = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  final _emailFormKey = GlobalKey<FormState>();
  final _otpFormKey = GlobalKey<FormState>();
  final _passwordFormKey = GlobalKey<FormState>();
  String? _devOtpHint;
  int _resendSeconds = 0;
  Timer? _resendTimer;

  @override
  void dispose() {
    _resendTimer?.cancel();
    _email.dispose();
    _otp.dispose();
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  void _startResendCooldown() {
    _resendTimer?.cancel();
    setState(() => _resendSeconds = 60);
    _resendTimer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) {
        t.cancel();
        return;
      }
      if (_resendSeconds <= 1) {
        t.cancel();
        setState(() => _resendSeconds = 0);
      } else {
        setState(() => _resendSeconds -= 1);
      }
    });
  }

  Future<void> _sendCode() async {
    if (!_emailFormKey.currentState!.validate()) return;
    ref.read(authProvider.notifier).clearError();
    try {
      final data = await ref.read(authProvider.notifier).requestPasswordResetOtp(_email.text.trim());
      setState(() {
        _step = 'otp';
        _devOtpHint = data['_devOtp']?.toString();
        _otp.clear();
      });
      _startResendCooldown();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(localizedApiError(e))));
      }
    }
  }

  Future<void> _verifyOtpStep() async {
    if (!_otpFormKey.currentState!.validate()) return;
    setState(() => _step = 'password');
  }

  Future<void> _resetPassword() async {
    if (!_passwordFormKey.currentState!.validate()) return;
    ref.read(authProvider.notifier).clearError();
    try {
      await ref.read(authProvider.notifier).resetPasswordWithOtp(
            _email.text.trim(),
            _otp.text.trim(),
            _password.text,
          );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('authPasswordResetSuccess'.tr())));
        context.go('/login');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(ref.read(authProvider).error ?? localizedApiError(e))),
        );
      }
    }
  }

  void _back() {
    setState(() {
      _step = switch (_step) {
        'password' => 'otp',
        'otp' => 'email',
        _ => 'email',
      };
    });
  }

  @override
  Widget build(BuildContext context) {
    final loading = ref.watch(authProvider).loading;
    return WeretAuthScaffold(
      title: 'authForgotPasswordTitle'.tr(),
      showBack: _step != 'email',
      onBack: _step != 'email' ? _back : null,
      subtitle: switch (_step) {
        'email' => 'authForgotPasswordSubtitle'.tr(),
        'otp' => 'authForgotPasswordOtpSubtitle'.tr(),
        'password' => 'authForgotPasswordNewSubtitle'.tr(),
        _ => null,
      },
      child: switch (_step) {
        'email' => _emailStep(),
        'otp' => _otpStep(loading),
        'password' => _passwordStep(loading),
        _ => _emailStep(),
      },
    );
  }

  Widget _emailStep() {
    return Form(
      key: _emailFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AuthFormField(
            label: 'email'.tr(),
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            validator: validateEmail,
            textInputAction: TextInputAction.done,
            onFieldSubmitted: (_) => _sendCode(),
          ),
          CustomButton(title: 'authForgotPasswordSend'.tr(), onPressed: _sendCode),
          WeretLinkButton(title: 'login'.tr(), onPressed: () => context.go('/login')),
        ],
      ),
    );
  }

  Widget _otpStep(bool loading) {
    return Form(
      key: _otpFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (_devOtpHint != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text('phoneOtpDevHint'.tr(namedArgs: {'code': _devOtpHint!}), style: const TextStyle(fontSize: 12, color: Colors.orange)),
            ),
          AuthFormField(
            label: 'phoneLoginOtpLabel'.tr(),
            controller: _otp,
            keyboardType: TextInputType.number,
            maxLength: 8,
            validator: validateOtp,
            textInputAction: TextInputAction.done,
            onFieldSubmitted: (_) => _verifyOtpStep(),
          ),
          CustomButton(title: 'registerNext'.tr(), onPressed: _verifyOtpStep),
          WeretLinkButton(
            title: _resendSeconds > 0
                ? 'phoneLoginResendIn'.tr(namedArgs: {'sec': '$_resendSeconds'})
                : 'phoneLoginResend'.tr(),
            onPressed: _resendSeconds > 0 ? () {} : _sendCode,
          ),
        ],
      ),
    );
  }

  Widget _passwordStep(bool loading) {
    return Form(
      key: _passwordFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AuthFormField(
            label: 'password'.tr(),
            controller: _password,
            obscure: true,
            validator: validatePassword,
            textInputAction: TextInputAction.next,
          ),
          AuthFormField(
            label: 'authPasswordConfirm'.tr(),
            controller: _confirm,
            obscure: true,
            validator: (v) => validatePasswordConfirm(v, _password.text),
            textInputAction: TextInputAction.done,
            onFieldSubmitted: (_) => _resetPassword(),
          ),
          CustomButton(title: 'authForgotPasswordReset'.tr(), loading: loading, onPressed: _resetPassword),
        ],
      ),
    );
  }
}
