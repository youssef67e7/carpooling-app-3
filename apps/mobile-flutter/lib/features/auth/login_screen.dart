import 'dart:async';

import 'package:easy_localization/easy_localization.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_styles.dart';
import '../../core/utils/api_error_message.dart';
import '../../core/utils/auth_navigation.dart';
import '../../core/utils/auth_validators.dart';
import '../../core/utils/google_o_auth_errors.dart';
import '../../shared/widgets/weret_logo.dart';

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
    if (_phoneFormKey.currentState == null || !_phoneFormKey.currentState!.validate()) return;
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
    if (_emailFormKey.currentState == null || !_emailFormKey.currentState!.validate()) return;
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

    return Scaffold(
      backgroundColor: AppColors.secondary,
      appBar: isWelcome
          ? null
          : AppBar(
              backgroundColor: Colors.transparent,
              elevation: 0,
              leading: IconButton(
                icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: AppColors.textPrimary),
                onPressed: _back,
              ),
            ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: switch (_step) {
            'welcome' => _welcome(auth),
            'phone' => _phoneStep(auth.error),
            'phoneOtp' => _otpStep(auth.loading, auth.error),
            'email' => _emailStep(auth.loading, auth.error),
            _ => _welcome(auth),
          },
        ),
      ),
    );
  }

  Widget _welcome(AuthState auth) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        const SizedBox(height: 60),
        const WeretLogo.wordmark(fontSize: 32),
        const SizedBox(height: 8),
        Text('Welcome back', style: AppStyles.headlineMedium),
        const SizedBox(height: 32),
        _errorBanner(auth.error),
        SizedBox(
          height: 50,
          child: TextField(
            controller: _phone,
            keyboardType: TextInputType.phone,
            decoration: InputDecoration(
              hintText: 'Phone number or Email',
              hintStyle: TextStyle(color: AppColors.textMuted, fontSize: 14),
              filled: true,
              fillColor: AppColors.inputBackground,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.borderLight),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.borderLight),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
              ),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            ),
          ),
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          height: 55,
          child: FilledButton(
            onPressed: () => setState(() => _step = 'phone'),
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
            ),
            child: const Text('Continue'),
          ),
        ),
        const SizedBox(height: 24),
        Row(
          children: [
            const Expanded(child: Divider(color: AppColors.borderLight, thickness: 1)),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Text('OR', style: TextStyle(color: AppColors.textMuted, fontSize: 12, fontWeight: FontWeight.w500)),
            ),
            const Expanded(child: Divider(color: AppColors.borderLight, thickness: 1)),
          ],
        ),
        const SizedBox(height: 24),
        if (auth.googleSignInEnabled)
          SizedBox(
            width: double.infinity,
            height: 50,
            child: OutlinedButton.icon(
              onPressed: _google,
              icon: Image.asset('assets/images/placeholder.png', width: 20, height: 20),
              label: Text('Google', style: TextStyle(color: AppColors.textPrimary, fontSize: 14, fontWeight: FontWeight.w600)),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: AppColors.borderLight),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                backgroundColor: Colors.transparent,
              ),
            ),
          )
        else
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text('weretGoogleDevHint'.tr(), textAlign: TextAlign.center, style: const TextStyle(fontSize: 12, height: 1.35)),
          ),
        const SizedBox(height: 24),
        TextButton(
          onPressed: () => setState(() => _step = 'email'),
          child: Text('Sign in with Email', style: TextStyle(color: AppColors.textSecondary, fontWeight: FontWeight.w600, fontSize: 14)),
        ),
        TextButton(
          onPressed: () => context.push('/register'),
          child: Text('Create an account', style: TextStyle(color: AppColors.textSecondary, fontWeight: FontWeight.w600, fontSize: 14)),
        ),
      ],
    );
  }

  Widget _buildInput(TextEditingController controller, {String? hint, bool obscure = false, TextInputType? keyboardType, String? Function(String?)? validator, TextInputAction? textInputAction, void Function(String)? onFieldSubmitted}) {
    return SizedBox(
      height: 50,
      child: TextFormField(
        controller: controller,
        obscureText: obscure,
        keyboardType: keyboardType,
        validator: validator,
        textInputAction: textInputAction,
        onFieldSubmitted: onFieldSubmitted,
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: TextStyle(color: AppColors.textMuted, fontSize: 14),
          filled: true,
          fillColor: AppColors.inputBackground,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: AppColors.borderLight),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: AppColors.borderLight),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
          ),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        ),
      ),
    );
  }

  Widget _primaryButton(String label, {bool loading = false, VoidCallback? onPressed}) {
    return SizedBox(
      width: double.infinity,
      height: 55,
      child: FilledButton(
        onPressed: onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
        ),
        child: loading
            ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
            : Text(label),
      ),
    );
  }

  Widget _textLink(String label, {VoidCallback? onPressed}) {
    return TextButton(
      onPressed: onPressed,
      child: Text(label, style: const TextStyle(color: AppColors.textSecondary, fontWeight: FontWeight.w600, fontSize: 14)),
    );
  }

  Widget _phoneStep(String? error) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 32),
        Text('Enter your phone number', style: AppStyles.headlineSmall),
        const SizedBox(height: 8),
        Text("We'll send you a verification code", style: AppStyles.bodyRegular),
        const SizedBox(height: 24),
        _errorBanner(error),
        _buildInput(
          _phone,
          hint: 'Phone number',
          keyboardType: TextInputType.phone,
          validator: (v) => validatePhone(v, required: true),
          textInputAction: TextInputAction.done,
          onFieldSubmitted: (_) => _sendOtp(),
        ),
        const SizedBox(height: 16),
        _primaryButton('Send Code', loading: _sendingOtp || _firebaseLoading, onPressed: _sendOtp),
        const SizedBox(height: 16),
        _textLink('Sign in with Email', onPressed: () => setState(() => _step = 'email')),
        _textLink('Create an account', onPressed: () => context.push('/register')),
      ],
    );
  }

  Widget _otpStep(bool loading, String? error) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 32),
        Text('Enter verification code', style: AppStyles.headlineSmall),
        if (_normalizedPhone != null) ...[
          const SizedBox(height: 8),
          Text("Sent to $_normalizedPhone", style: AppStyles.bodyRegular),
        ],
        const SizedBox(height: 24),
        _errorBanner(error),
        if (_devOtpHint != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text('phoneOtpDevHint'.tr(namedArgs: {'code': _devOtpHint!}), style: const TextStyle(fontSize: 12, color: Colors.orange)),
          ),
        _buildInput(
          _otp,
          hint: 'Code',
          keyboardType: TextInputType.number,
          validator: validateOtp,
          textInputAction: TextInputAction.done,
          onFieldSubmitted: (_) => _verifyOtp(),
        ),
        const SizedBox(height: 16),
        _primaryButton('Verify', loading: loading, onPressed: _verifyOtp),
        const SizedBox(height: 16),
        _textLink(
          _resendSeconds > 0 ? 'Resend in $_resendSeconds sec' : 'Resend code',
          onPressed: _resendSeconds > 0 ? () {} : _sendOtp,
        ),
        _textLink('Change phone number', onPressed: () => setState(() => _step = 'phone')),
      ],
    );
  }

  Widget _emailStep(bool loading, String? error) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 32),
        Text('Sign in with Email', style: AppStyles.headlineSmall),
        const SizedBox(height: 24),
        _errorBanner(error),
        _buildInput(
          _email,
          hint: 'Email',
          keyboardType: TextInputType.emailAddress,
          validator: validateEmail,
          textInputAction: TextInputAction.next,
        ),
        const SizedBox(height: 16),
        _buildInput(
          _password,
          hint: 'Password',
          obscure: true,
          validator: validatePassword,
          textInputAction: TextInputAction.done,
          onFieldSubmitted: (_) => _emailLogin(),
        ),
        const SizedBox(height: 16),
        _primaryButton('Login', loading: loading, onPressed: _emailLogin),
        const SizedBox(height: 16),
        _textLink('Forgot password?', onPressed: () => context.push('/forgot-password')),
        _textLink('Create an account', onPressed: () => context.push('/register')),
      ],
    );
  }
}
