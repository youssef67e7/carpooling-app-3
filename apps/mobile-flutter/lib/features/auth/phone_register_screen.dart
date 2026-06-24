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
import '../../core/theme/auth_flow.dart';
import '../../shared/widgets/auth_form_field.dart';
import '../../shared/widgets/custom_button.dart';
import '../../shared/widgets/weret_auth_scaffold.dart';

class PhoneRegisterScreen extends ConsumerStatefulWidget {
  const PhoneRegisterScreen({super.key, this.forDriver = false});

  final bool forDriver;

  @override
  ConsumerState<PhoneRegisterScreen> createState() => _PhoneRegisterScreenState();
}

class _PhoneRegisterScreenState extends ConsumerState<PhoneRegisterScreen> {
  String _step = 'phone';
  final _phone = TextEditingController();
  final _otp = TextEditingController();
  final _name = TextEditingController();
  final _phoneFormKey = GlobalKey<FormState>();
  final _detailsFormKey = GlobalKey<FormState>();
  String? _devOtpHint;
  String? _normalizedPhone;
  bool _sendingOtp = false;
  bool _acceptedTerms = false;
  int _resendSeconds = 0;
  Timer? _resendTimer;
  String? _verificationId;
  bool _firebaseLoading = false;

  @override
  void dispose() {
    _resendTimer?.cancel();
    _phone.dispose();
    _otp.dispose();
    _name.dispose();
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

  Future<void> _completeRegister() async {
    ref.read(authProvider.notifier).clearError();
    if (!_acceptedTerms) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('authTermsRequired'.tr())));
      return;
    }
    if (!_detailsFormKey.currentState!.validate()) return;
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
            _step = 'details';
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
      await ref.read(authProvider.notifier).verifyFirebasePhone(
            firebaseIdToken,
            name: _name.text.trim().isEmpty ? null : _name.text.trim(),
          );
      if (!mounted) return;
      if (widget.forDriver) {
        context.go('/driver/onboarding');
      } else {
        context.go(AuthNavigation.homeForUser(ref.read(authProvider).user));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(localizedApiError(e))));
      }
    }
  }

  void _back() {
    setState(() {
      _step = switch (_step) {
        'details' => 'phone',
        _ => 'phone',
      };
    });
  }

  @override
  Widget build(BuildContext context) {
    final loading = ref.watch(authProvider).loading;
    return WeretAuthScaffold(
      flow: widget.forDriver ? AuthFlow.driver : AuthFlow.passenger,
      title: widget.forDriver ? 'registerDriverTitle'.tr() : 'registerPassengerTitle'.tr(),
      stepLabel: widget.forDriver ? 'registerDriverStepAccount'.tr() : null,
      showBack: true,
      onBack: _step == 'details' ? _back : () => context.pop(),
      subtitle: switch (_step) {
        'phone' => 'phoneRegisterSubtitle'.tr(),
        'details' => _normalizedPhone != null
            ? 'phoneLoginSentTo'.tr(namedArgs: {'phone': _normalizedPhone!})
            : 'phoneRegisterDetailsSubtitle'.tr(),
        _ => null,
      },
      child: switch (_step) {
        'phone' => _phoneStep(),
        'details' => _detailsStep(loading),
        _ => _phoneStep(),
      },
    );
  }

  Widget _phoneStep() {
    return Form(
      key: _phoneFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
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
          WeretLinkButton(title: 'login'.tr(), onPressed: () => context.go('/login')),
        ],
      ),
    );
  }

  Widget _detailsStep(bool loading) {
    return Form(
      key: _detailsFormKey,
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
            textInputAction: TextInputAction.next,
          ),
          AuthFormField(
            label: 'name'.tr(),
            controller: _name,
            validator: validateName,
            textInputAction: TextInputAction.done,
            onFieldSubmitted: (_) => _completeRegister(),
          ),
          CheckboxListTile(
            contentPadding: EdgeInsets.zero,
            value: _acceptedTerms,
            onChanged: (v) => setState(() => _acceptedTerms = v ?? false),
            title: Text('authTermsAccept'.tr(), style: const TextStyle(fontSize: 13, height: 1.35)),
            controlAffinity: ListTileControlAffinity.leading,
          ),
          CustomButton(title: 'phoneRegisterCreate'.tr(), loading: loading, onPressed: _completeRegister),
          WeretLinkButton(
            title: _resendSeconds > 0
                ? 'phoneLoginResendIn'.tr(namedArgs: {'sec': '$_resendSeconds'})
                : 'phoneLoginResend'.tr(),
            onPressed: _resendSeconds > 0 ? () {} : _sendOtp,
          ),
        ],
      ),
    );
  }
}
