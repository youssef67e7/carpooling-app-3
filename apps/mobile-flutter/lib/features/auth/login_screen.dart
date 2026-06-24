import 'dart:async';

import 'package:easy_localization/easy_localization.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/utils/api_error_message.dart';
import '../../core/utils/auth_navigation.dart';
import '../../core/utils/auth_validators.dart';
import '../../core/utils/google_o_auth_errors.dart';
import '../../shared/widgets/auth_form_field.dart';
import '../../shared/widgets/custom_button.dart';
import '../../shared/widgets/weret_auth_scaffold.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});
  static const routePath = '/login';

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  String _step = 'welcome';
  final _phone = TextEditingController();
  final _otp = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _phoneFormKey = GlobalKey<FormState>();
  final _otpFormKey = GlobalKey<FormState>();
  final _emailFormKey = GlobalKey<FormState>();
  String? _devOtpHint;
  String? _normalizedPhone;
  bool _sendingOtp = false;
  int _resendSeconds = 0;
  Timer? _resendTimer;
  String? _verificationId;
  bool _firebaseLoading = false;

  @override
  void dispose() {
    _resendTimer?.cancel();
    _phone.dispose();
    _otp.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  void _goHome() {
    final user = ref.read(authProvider).user;
    context.go(AuthNavigation.homeForUser(user));
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

  Future<void> _google() async {
    final auth = ref.read(authProvider);
    if (!auth.googleSignInEnabled) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('weretGoogleNotConfigured'.tr())));
      return;
    }
    ref.read(authProvider.notifier).clearError();
    try {
      final google = ref.read(authProvider.notifier).googleSignIn;
      final account = await google.signIn();
      if (account == null) return;
      final gAuth = await account.authentication;
      final idToken = gAuth.idToken;
      if (idToken == null) throw Exception('No Google ID token');
      await ref.read(authProvider.notifier).signInWithGoogle(idToken, accessToken: gAuth.accessToken);
      if (mounted) _goHome();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(mapGoogleSignInError(e))));
      }
    }
  }

  Future<void> _sendOtp() async {
    if (!_phoneFormKey.currentState!.validate()) return;
    setState(() => _sendingOtp = true);
    ref.read(authProvider.notifier).clearError();
    try {
      final phone = _phone.text.trim();
      final e164 = phone.startsWith('+') ? phone : '+20${phone.replaceFirst(RegExp(r'^0+'), '')}';
      setState(() => _normalizedPhone = e164);
      await _sendRealSmsOtp(e164);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(localizedApiError(e))));
      }
    } finally {
      if (mounted) setState(() => _sendingOtp = false);
    }
  }

  Future<void> _verifyOtp() async {
    if (!_otpFormKey.currentState!.validate()) return;
    ref.read(authProvider.notifier).clearError();
    try {
      await _verifyRealSmsOtp(_otp.text.trim());
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(localizedApiError(e))));
      }
    }
  }

  Future<void> _sendRealSmsOtp(String phoneNumber) async {
    setState(() => _firebaseLoading = true);
    try {
      await FirebaseAuth.instance.verifyPhoneNumber(
        phoneNumber: phoneNumber,
        verificationCompleted: (PhoneAuthCredential credential) async {
          final userCredential = await FirebaseAuth.instance.signInWithCredential(credential);
          final idToken = await userCredential.user?.getIdToken();
          if (idToken != null) {
            await _sendTokenToBackend(idToken);
          }
        },
        verificationFailed: (FirebaseAuthException e) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message ?? 'Verification failed')));
          }
        },
        codeSent: (String verificationId, int? resendToken) {
          if (!mounted) return;
          setState(() {
            _verificationId = verificationId;
            _step = 'phoneOtp';
          });
          _startResendCooldown();
        },
        codeAutoRetrievalTimeout: (String verificationId) {},
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _firebaseLoading = false);
    }
  }

  Future<void> _verifyRealSmsOtp(String smsCode) async {
    if (_verificationId == null) return;
    try {
      final credential = PhoneAuthProvider.credential(
        verificationId: _verificationId!,
        smsCode: smsCode,
      );
      final userCredential = await FirebaseAuth.instance.signInWithCredential(credential);
      final idToken = await userCredential.user?.getIdToken();
      if (idToken != null) {
        await _sendTokenToBackend(idToken);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  Future<void> _sendTokenToBackend(String firebaseIdToken) async {
    ref.read(authProvider.notifier).clearError();
    try {
      await ref.read(authProvider.notifier).verifyFirebasePhone(firebaseIdToken);
      if (mounted) _goHome();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(localizedApiError(e))));
      }
    }
  }

  Future<void> _emailLogin() async {
    if (!_emailFormKey.currentState!.validate()) return;
    ref.read(authProvider.notifier).clearError();
    try {
      await ref.read(authProvider.notifier).loginEmail(_email.text.trim(), _password.text);
      if (mounted) _goHome();
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
        'phoneOtp' => 'phone',
        'phone' || 'email' => 'welcome',
        _ => 'welcome',
      };
    });
  }

  Widget _errorBanner(String? error) {
    if (error == null || error.isEmpty) return const SizedBox.shrink();
    final key = authBannerKeyForError(error);
    final text = key != null ? key.tr() : error;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.red.shade200),
      ),
      child: Text(text, style: TextStyle(color: Colors.red.shade800, fontSize: 13, height: 1.35)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final isWelcome = _step == 'welcome';

    return WeretAuthScaffold(
      title: isWelcome ? null : 'login'.tr(),
      showBack: !isWelcome,
      onBack: isWelcome ? null : _back,
      showBrand: true,
      showLanguage: true,
      showConnection: !isWelcome,
      centerBrand: isWelcome,
      subtitle: switch (_step) {
        'phone' => 'phoneLoginSubtitle'.tr(),
        'phoneOtp' => _normalizedPhone != null
            ? 'phoneLoginSentTo'.tr(namedArgs: {'phone': _normalizedPhone!})
            : 'phoneLoginOtpLabel'.tr(),
        'email' => 'loginSubtitle'.tr(),
        _ => null,
      },
      child: switch (_step) {
        'welcome' => _welcome(auth),
        'phone' => _phoneStep(auth.error),
        'phoneOtp' => _otpStep(auth.loading, auth.error),
        'email' => _emailStep(auth.loading, auth.error),
        _ => _welcome(auth),
      },
    );
  }

  Widget _welcome(AuthState auth) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 48),
        _errorBanner(auth.error),
        CustomButton(title: 'weretContinuePhone'.tr(), icon: Icons.phone_outlined, onPressed: () => setState(() => _step = 'phone')),
        const SizedBox(height: 12),
        if (auth.googleSignInEnabled)
          CustomButton(
            title: 'weretContinueGoogle'.tr(),
            icon: Icons.g_mobiledata_rounded,
            loading: auth.loading,
            onPressed: _google,
          )
        else
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text('weretGoogleDevHint'.tr(), textAlign: TextAlign.center, style: const TextStyle(fontSize: 12, height: 1.35)),
          ),
        const SizedBox(height: 12),
        WeretLinkButton(title: 'weretContinueEmail'.tr(), onPressed: () => setState(() => _step = 'email')),
        const SizedBox(height: 8),
        WeretLinkButton(title: 'register'.tr(), onPressed: () => context.push('/register')),
      ],
    );
  }

  Widget _phoneStep(String? error) {
    return Form(
      key: _phoneFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _errorBanner(error),
          AuthFormField(
            label: 'phone'.tr(),
            controller: _phone,
            keyboardType: TextInputType.phone,
            hint: 'phonePlaceholder'.tr(),
            helper: 'phoneLoginHint'.tr(),
            validator: (v) => validatePhone(v, required: true),
            textInputAction: TextInputAction.done,
            onFieldSubmitted: (_) => _sendOtp(),
          ),
          CustomButton(title: 'phoneLoginSendCode'.tr(), loading: _sendingOtp || _firebaseLoading, onPressed: _sendOtp),
          WeretLinkButton(title: 'weretContinueEmail'.tr(), onPressed: () => setState(() => _step = 'email')),
          WeretLinkButton(title: 'register'.tr(), onPressed: () => context.push('/register')),
        ],
      ),
    );
  }

  Widget _otpStep(bool loading, String? error) {
    return Form(
      key: _otpFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _errorBanner(error),
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
            onFieldSubmitted: (_) => _verifyOtp(),
          ),
          CustomButton(title: 'phoneLoginVerify'.tr(), loading: loading, onPressed: _verifyOtp),
          WeretLinkButton(
            title: _resendSeconds > 0
                ? 'phoneLoginResendIn'.tr(namedArgs: {'sec': '$_resendSeconds'})
                : 'phoneLoginResend'.tr(),
            onPressed: _resendSeconds > 0 ? () {} : _sendOtp,
          ),
          WeretLinkButton(title: 'phoneLoginChangeNumber'.tr(), onPressed: () => setState(() => _step = 'phone')),
        ],
      ),
    );
  }

  Widget _emailStep(bool loading, String? error) {
    return Form(
      key: _emailFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _errorBanner(error),
          AuthFormField(
            label: 'email'.tr(),
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            validator: validateEmail,
            textInputAction: TextInputAction.next,
          ),
          AuthFormField(
            label: 'password'.tr(),
            controller: _password,
            obscure: true,
            validator: validatePassword,
            textInputAction: TextInputAction.done,
            onFieldSubmitted: (_) => _emailLogin(),
          ),
          const SizedBox(height: 8),
          CustomButton(title: 'login'.tr(), loading: loading, onPressed: _emailLogin),
          WeretLinkButton(title: 'authForgotPasswordTitle'.tr(), onPressed: () => context.push('/forgot-password')),
          WeretLinkButton(title: 'register'.tr(), onPressed: () => context.push('/register')),
        ],
      ),
    );
  }
}
