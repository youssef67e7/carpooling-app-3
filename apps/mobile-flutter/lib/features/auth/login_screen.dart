import 'dart:async';

import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers/auth_provider.dart';
import '../../core/theme/weret_tokens.dart';
import '../../core/theme/app_styles.dart';
import '../../core/utils/api_error_message.dart';
import '../../core/utils/auth_navigation.dart';
import '../../core/utils/auth_validators.dart';
import '../../core/utils/google_o_auth_errors.dart';
import '../../shared/widgets/otp_input.dart';
import '../../shared/widgets/ui/form_error_callout.dart';
import '../../shared/widgets/weret_logo.dart';

enum _LoginStep { welcome, email, emailOtp }

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});
  static const routePath = '/login';

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  static const _xs = 8.0;
  static const _sm = 12.0;
  static const _md = 16.0;
  static const _lg = 24.0;
  static const _xl = 32.0;
  static const _xxl = 60.0;
  static const _cooldownSec = 60;
  static const _transitionMs = 350;
  static const _otpLength = 6;

  _LoginStep _step = _LoginStep.welcome;

  final _identifier = TextEditingController();
  final _email = TextEditingController();
  final _emailOtp = TextEditingController();

  final _identifierFocus = FocusNode();
  final _emailFocus = FocusNode();

  final _emailFormKey = GlobalKey<FormState>();
  final _emailOtpFormKey = GlobalKey<FormState>();

  String? _normalizedEmail;
  int _resendSeconds = 0;
  Timer? _resendTimer;

  bool _emailOtpLoading = false;
  String? _localError;
  bool _errorDismissed = false;

  bool get _anyLoading => _emailOtpLoading || ref.read(authProvider).loading;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _identifierFocus.requestFocus();
    });
  }

  @override
  void dispose() {
    _resendTimer?.cancel();
    for (final c in [_identifier, _email, _emailOtp]) {
      c.dispose();
    }
    for (final f in [_identifierFocus, _emailFocus]) {
      f.dispose();
    }
    super.dispose();
  }

  void _goTo(_LoginStep next) {
    setState(() {
      _step = next;
      _localError = null;
      _errorDismissed = false;
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final focus = switch (next) {
        _LoginStep.welcome => _identifierFocus,
        _LoginStep.email => _emailFocus,
        _LoginStep.emailOtp => null,
      };
      focus?.requestFocus();
    });
  }

  void _goBack() {
    final prev = switch (_step) {
      _LoginStep.emailOtp => _LoginStep.email,
      _LoginStep.email || _LoginStep.welcome => null,
    };
    if (prev != null && !_anyLoading) _goTo(prev);
  }

  void _goHome() {
    final user = ref.read(authProvider).user;
    context.go(AuthNavigation.homeForUser(user));
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

  void _continueFromWelcome() {
    HapticFeedback.selectionClick();
    final input = _identifier.text.trim();
    if (input.isEmpty) {
      _setError('Please enter your email address');
      return;
    }
    _email.text = input;
    _goTo(_LoginStep.email);
  }

  Future<void> _googleSignIn() async {
    final auth = ref.read(authProvider);
    if (!auth.googleSignInEnabled) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('weretGoogleNotConfigured'.tr())),
      );
      return;
    }
    HapticFeedback.mediumImpact();
    ref.read(authProvider.notifier).clearError();
    try {
      final account =
          await ref.read(authProvider.notifier).googleSignIn.signIn();
      if (account == null) return;
      final g = await account.authentication;
      if (g.idToken == null) throw Exception('No Google ID token');
      await ref.read(authProvider.notifier).signInWithGoogle(
        g.idToken!,
        accessToken: g.accessToken,
      );
      if (mounted) _goHome();
    } catch (e) {
      if (mounted) _setError(mapGoogleSignInError(e));
    }
  }

  Future<void> _sendEmailOtp() async {
    if (_emailFormKey.currentState?.validate() != true) return;
    HapticFeedback.mediumImpact();
    setState(() => _emailOtpLoading = true);
    ref.read(authProvider.notifier).clearError();
    try {
      final email = _email.text.trim();
      await ref.read(authProvider.notifier).requestEmailOtp(email);
      if (!mounted) return;
      setState(() => _normalizedEmail = email);
      _goTo(_LoginStep.emailOtp);
      _startCooldown();
    } catch (e) {
      if (mounted) _setError(localizedApiError(e));
    } finally {
      if (mounted) setState(() => _emailOtpLoading = false);
    }
  }

  Future<void> _verifyEmailOtp() async {
    if (_emailOtpFormKey.currentState?.validate() != true) return;
    HapticFeedback.mediumImpact();
    ref.read(authProvider.notifier).clearError();
    try {
      final code = _emailOtp.text.trim();
      await ref.read(authProvider.notifier)
          .verifyEmailOtp(_normalizedEmail!, code);
      if (mounted) _goHome();
    } catch (e) {
      if (mounted) _setError(localizedApiError(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final showAppBar = _step != _LoginStep.welcome;

    return Scaffold(
      backgroundColor: WeretTokens.bg,
      appBar: showAppBar
          ? AppBar(
              backgroundColor: Colors.transparent,
              elevation: 0,
              leading: IconButton(
                icon: const Icon(
                  Icons.arrow_back_ios_new_rounded,
                  size: 20,
                  color: WeretTokens.textPrimary,
                ),
                onPressed: _anyLoading ? null : _goBack,
              ),
            )
          : null,
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
                      _LoginStep.welcome => _buildWelcome(auth),
                      _LoginStep.email => _buildEmail(auth.error),
                      _LoginStep.emailOtp => _buildOtp(auth.loading, auth.error),
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

  Widget _buildWelcome(AuthState auth) {
    if (!auth.googleSignInEnabled && auth.hydrated) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        ref.read(authProvider.notifier).retryLoadGoogleConfig();
      });
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        const SizedBox(height: _xxl),
        const WeretLogo.wordmark(fontSize: 32),
        const SizedBox(height: _xs),
        Text('Welcome back', style: AppStyles.headlineMedium),
        const SizedBox(height: _lg),

        if (_displayError(auth.error) != null)
          FormErrorCallout(
            message: _displayError(auth.error)!,
            onDismiss: _dismissError,
          ),

        _WeretTextField(
          controller: _identifier,
          focusNode: _identifierFocus,
          hint: 'Email address',
          keyboardType: TextInputType.emailAddress,
          textInputAction: TextInputAction.go,
          onFieldSubmitted:
              _anyLoading ? null : (_) => _continueFromWelcome(),
          prefixIcon: Icons.mail_outline_rounded,
        ),
        const SizedBox(height: _md),

        _LoginPrimaryButton(
          label: 'Continue',
          loading: false,
          onPressed: _continueFromWelcome,
        ),
        const SizedBox(height: _lg),

        const _OrDivider(),
        const SizedBox(height: _lg),

        if (auth.googleSignInEnabled)
          _GoogleButton(onPressed: _googleSignIn)
        else
          Padding(
            padding: const EdgeInsets.only(bottom: _sm),
            child: Text(
              'weretGoogleDevHint'.tr(),
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: WeretTokens.textMuted,
                fontSize: 12,
                height: 1.35,
              ),
            ),
          ),
        const SizedBox(height: _lg),

        _LoginTextLink(
          label: 'Create an account',
          onPressed:
              _anyLoading ? null : () => context.push('/register'),
        ),
        const SizedBox(height: _lg),

        const Text(
          'By continuing, you agree to our Terms of Service and Privacy Policy',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: WeretTokens.textMuted,
            fontSize: 11,
            height: 1.4,
          ),
        ),
      ],
    );
  }

  Widget _buildEmail(String? providerError) {
    return Form(
      key: _emailFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: _xl),
          Text('Enter your email', style: AppStyles.headlineSmall),
          const SizedBox(height: _xs),
          Text(
            "We'll send a verification code to your inbox",
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
                _anyLoading ? null : (_) => _sendEmailOtp(),
            prefixIcon: Icons.mail_outline_rounded,
          ),
          const SizedBox(height: _md),

          _LoginPrimaryButton(
            label: 'Send Code',
            loading: _anyLoading,
            onPressed: _anyLoading ? null : _sendEmailOtp,
          ),
          const SizedBox(height: _md),

          _LoginTextLink(
            label: 'Create an account',
            onPressed:
                _anyLoading ? null : () => context.push('/register'),
          ),
        ],
      ),
    );
  }

  Widget _buildOtp(bool providerLoading, String? providerError) {
    return Form(
      key: _emailOtpFormKey,
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
              _emailOtp.text = code;
              if (!_anyLoading) _verifyEmailOtp();
            },
          ),
          const SizedBox(height: _md),

          _LoginPrimaryButton(
            label: 'Verify',
            loading: _anyLoading || providerLoading,
            onPressed:
                (_anyLoading || providerLoading) ? null : _verifyEmailOtp,
          ),
          const SizedBox(height: _md),

          _LoginTextLink(
            label: _resendSeconds > 0
                ? 'Resend in ${_resendSeconds}s'
                : 'Resend code',
            onPressed:
                (_resendSeconds > 0 || _anyLoading) ? null : _sendEmailOtp,
          ),
          _LoginTextLink(
            label: 'Change email address',
            onPressed:
                _anyLoading ? null : () => _goTo(_LoginStep.email),
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

class _OrDivider extends StatelessWidget {
  const _OrDivider();
  @override
  Widget build(BuildContext context) {
    return const Row(children: [
      Expanded(child: Divider(color: WeretTokens.borderSubtle)),
      Padding(
        padding: EdgeInsets.symmetric(horizontal: 14),
        child: Text(
          'OR',
          style: TextStyle(
            color: WeretTokens.textMuted,
            fontSize: 11,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.5,
          ),
        ),
      ),
      Expanded(child: Divider(color: WeretTokens.borderSubtle)),
    ]);
  }
}

class _GoogleButton extends StatelessWidget {
  final VoidCallback? onPressed;
  const _GoogleButton({this.onPressed});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 50,
      child: OutlinedButton.icon(
        onPressed: onPressed,
        icon: Image.asset(
          'assets/images/design/03_google_modal_avatar_a.png',
          width: 20,
          height: 20,
        ),
        label: const Text(
          'Continue with Google',
          style: TextStyle(
            color: WeretTokens.textPrimary,
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
        style: OutlinedButton.styleFrom(
          side: const BorderSide(color: WeretTokens.borderSubtle),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
    );
  }
}

class _WeretTextField extends StatelessWidget {
  final TextEditingController controller;
  final FocusNode? focusNode;
  final String? hint;
  final TextInputType? keyboardType;
  final String? Function(String?)? validator;
  final TextInputAction? textInputAction;
  final void Function(String)? onFieldSubmitted;
  final IconData? prefixIcon;

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
    this.keyboardType,
    this.validator,
    this.textInputAction,
    this.onFieldSubmitted,
    this.prefixIcon,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 50,
      child: TextFormField(
        controller: controller,
        focusNode: focusNode,
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
