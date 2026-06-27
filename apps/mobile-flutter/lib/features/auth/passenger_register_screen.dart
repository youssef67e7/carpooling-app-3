import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers/auth_provider.dart';
import '../../core/theme/app_styles.dart';
import '../../core/theme/weret_tokens.dart';
import '../../core/utils/api_error_message.dart';
import '../../core/utils/auth_validators.dart';
import '../../shared/widgets/ui/form_error_callout.dart';
import '../../shared/widgets/weret_logo.dart';

// ── Country codes ─────────────────────────────────────────────────────
const _countryCodes = [
  _CountryCode('+20', 'EG', '🇪🇬'),
  _CountryCode('+1', 'US', '🇺🇸'),
  _CountryCode('+44', 'GB', '🇬🇧'),
  _CountryCode('+971', 'AE', '🇦🇪'),
  _CountryCode('+966', 'SA', '🇸🇦'),
  _CountryCode('+49', 'DE', '🇩🇪'),
  _CountryCode('+33', 'FR', '🇫🇷'),
  _CountryCode('+91', 'IN', '🇮🇳'),
];

class _CountryCode {
  final String dialCode;
  final String code;
  final String flag;
  const _CountryCode(this.dialCode, this.code, this.flag);
}

enum _RegisterStep { welcome, account }

class PassengerRegisterScreen extends ConsumerStatefulWidget {
  const PassengerRegisterScreen({super.key});
  static const routePath = '/register/passenger';

  @override
  ConsumerState<PassengerRegisterScreen> createState() =>
      _PassengerRegisterScreenState();
}

class _PassengerRegisterScreenState
    extends ConsumerState<PassengerRegisterScreen> {
  static const _xs = 8.0;
  static const _sm = 12.0;
  static const _md = 16.0;
  static const _lg = 24.0;
  static const _xxl = 60.0;
  static const _fieldGap = 14.0;
  static const _transitionMs = 350;

  _RegisterStep _step = _RegisterStep.welcome;

  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  final _phone = TextEditingController();

  final _nameFocus = FocusNode();
  final _emailFocus = FocusNode();
  final _passwordFocus = FocusNode();
  final _confirmFocus = FocusNode();
  final _phoneFocus = FocusNode();

  final _formKey = GlobalKey<FormState>();

  bool _acceptedTerms = false;
  bool _obscurePassword = true;
  bool _obscureConfirm = true;
  bool _registering = false;
  int _selectedCountryIndex = 0;

  String? _localError;
  bool _errorDismissed = false;

  bool get _anyLoading => _registering || ref.read(authProvider).loading;

  @override
  void dispose() {
    for (final c in [_name, _email, _password, _confirm, _phone]) {
      c.dispose();
    }
    for (final f in [
      _nameFocus, _emailFocus, _passwordFocus, _confirmFocus, _phoneFocus
    ]) {
      f.dispose();
    }
    super.dispose();
  }

  void _goTo(_RegisterStep next) {
    setState(() {
      _step = next;
      _localError = null;
      _errorDismissed = false;
    });
    if (next == _RegisterStep.account) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _nameFocus.requestFocus();
      });
    }
  }

  void _goBack() {
    if (_anyLoading) return;
    if (_step == _RegisterStep.account) {
      _goTo(_RegisterStep.welcome);
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

  void _proceedToForm() {
    HapticFeedback.selectionClick();
    _goTo(_RegisterStep.account);
  }

  Future<void> _register() async {
    if (!_acceptedTerms) {
      HapticFeedback.heavyImpact();
      _setError('Please accept the terms and conditions');
      return;
    }
    if (_formKey.currentState?.validate() != true) return;
    HapticFeedback.mediumImpact();
    setState(() => _registering = true);
    ref.read(authProvider.notifier).clearError();
    try {
      final rawPhone = _phone.text.trim();
      final e164 = rawPhone.startsWith('+')
          ? rawPhone
          : '${_countryCodes[_selectedCountryIndex].dialCode}${rawPhone.replaceFirst(RegExp(r'^0+'), '')}';
      await ref.read(authProvider.notifier).register({
        'name': _name.text.trim(),
        'email': _email.text.trim(),
        'password': _password.text.trim(),
        'phone': e164,
      });
      if (mounted) context.go('/passenger/home');
    } catch (e) {
      if (mounted) _setError(localizedApiError(e));
    } finally {
      if (mounted) setState(() => _registering = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final isWelcome = _step == _RegisterStep.welcome;

    return Scaffold(
      backgroundColor: WeretTokens.bg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: WeretTokens.textPrimary),
          onPressed: _goBack,
        ),
        title: isWelcome ? null : const Text('Create your account', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
        centerTitle: true,
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
                      _RegisterStep.welcome => _buildWelcome(),
                      _RegisterStep.account => _buildAccount(auth.error),
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

  Widget _buildWelcome() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        const SizedBox(height: _xxl + 16),
        const WeretLogo.wordmark(fontSize: 32),
        const SizedBox(height: _xs),
        Text('Create Account', style: AppStyles.headlineMedium),
        const SizedBox(height: _sm),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Text(
            'registerPassengerIntro'.tr(),
            textAlign: TextAlign.center,
            style: AppStyles.bodyRegular,
          ),
        ),
        const Spacer(flex: 2),
        const SizedBox(height: 40),
        Icon(
          Icons.directions_car_outlined,
          size: 100,
          color: WeretTokens.brand.withValues(alpha: 0.15),
        ),
        const Spacer(flex: 3),
        _RegisterPrimaryButton(
          label: 'Get Started',
          onPressed: _proceedToForm,
        ),
        const SizedBox(height: _lg),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
              const Text(
                'Already have an account?',
                style: TextStyle(color: WeretTokens.textMuted, fontSize: 14),
              ),
            _RegisterTextLink(
              label: 'Login',
              onPressed: () {
                HapticFeedback.selectionClick();
                context.go('/login');
              },
              padding: const EdgeInsets.only(left: 4),
            ),
          ],
        ),
        const SizedBox(height: _lg),
      ],
    );
  }

  Widget _buildAccount(String? providerError) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: _sm),
          Text(
            'Fill in your details to get started',
            style: AppStyles.bodyRegular,
          ),
          const SizedBox(height: _lg),

          if (_displayError(providerError) != null)
            FormErrorCallout(
              message: _displayError(providerError)!,
              onDismiss: _dismissError,
            ),

          _WeretTextField(
            controller: _name,
            focusNode: _nameFocus,
            hint: 'Full name',
            keyboardType: TextInputType.name,
            textInputAction: TextInputAction.next,
            onFieldSubmitted: (_) => _emailFocus.requestFocus(),
            prefixIcon: Icons.person_outline_rounded,
            validator: (v) {
              if (v == null || v.trim().isEmpty) return 'Please enter your name';
              if (v.trim().length < 3) return 'Name must be at least 3 characters';
              return null;
            },
          ),
          const SizedBox(height: _fieldGap),

          _WeretTextField(
            controller: _email,
            focusNode: _emailFocus,
            hint: 'Email address',
            keyboardType: TextInputType.emailAddress,
            validator: validateEmail,
            textInputAction: TextInputAction.next,
            onFieldSubmitted: (_) => _passwordFocus.requestFocus(),
            prefixIcon: Icons.mail_outline_rounded,
          ),
          const SizedBox(height: _fieldGap),

          _WeretTextField(
            controller: _password,
            focusNode: _passwordFocus,
            hint: 'Password',
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
          const SizedBox(height: _fieldGap),

          _WeretTextField(
            controller: _confirm,
            focusNode: _confirmFocus,
            hint: 'Confirm password',
            obscureText: _obscureConfirm,
            validator: (v) {
              if (v == null || v.isEmpty) return 'Please confirm your password';
              if (v != _password.text) return 'Passwords do not match';
              return null;
            },
            textInputAction: TextInputAction.next,
            onFieldSubmitted: (_) => _phoneFocus.requestFocus(),
            prefixIcon: Icons.lock_outline_rounded,
            suffixIcon: _PasswordToggle(
              obscured: _obscureConfirm,
              onToggle: () =>
                  setState(() => _obscureConfirm = !_obscureConfirm),
            ),
          ),
          const SizedBox(height: _fieldGap),

          Row(
            children: [
              _CountryCodeSelector(
                selectedIndex: _selectedCountryIndex,
                codes: _countryCodes,
                onChanged: (i) =>
                    setState(() => _selectedCountryIndex = i),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _WeretTextField(
                  controller: _phone,
                  focusNode: _phoneFocus,
                  hint: 'Phone number',
                  keyboardType: TextInputType.phone,
                  validator: (v) => validatePhone(v, required: true),
                  textInputAction: TextInputAction.done,
                  onFieldSubmitted:
                      _anyLoading ? null : (_) => _register(),
                ),
              ),
            ],
          ),
          const SizedBox(height: _lg),

          _TermsCheckbox(
            accepted: _acceptedTerms,
            onChanged: (v) => setState(() {
              _acceptedTerms = v;
              if (v) _errorDismissed = true;
            }),
          ),
          const SizedBox(height: _md),

          _RegisterPrimaryButton(
            label: 'Create Account',
            loading: _anyLoading,
            onPressed: _anyLoading ? null : _register,
          ),
          const SizedBox(height: _md),

          Center(
            child: _RegisterTextLink(
              label: 'Already have an account? Login',
              onPressed: _anyLoading
                  ? null
                  : () {
                      HapticFeedback.selectionClick();
                      context.go('/login');
                    },
            ),
          ),
          const SizedBox(height: _lg),
        ],
      ),
    );
  }
}

class _RegisterPrimaryButton extends StatelessWidget {
  final String label;
  final bool loading;
  final VoidCallback? onPressed;
  const _RegisterPrimaryButton({
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

class _RegisterTextLink extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final EdgeInsetsGeometry padding;
  const _RegisterTextLink({
    required this.label,
    this.onPressed,
    this.padding = const EdgeInsets.symmetric(horizontal: 4),
  });

  @override
  Widget build(BuildContext context) {
    return TextButton(
      onPressed: onPressed,
      style: TextButton.styleFrom(
        minimumSize: const Size.fromHeight(36),
        padding: padding,
      ),
      child: Text(
        label,
        style: TextStyle(
          color: onPressed != null
              ? WeretTokens.brand
              : WeretTokens.textMuted,
          fontWeight: FontWeight.w600,
          fontSize: 14,
        ),
      ),
    );
  }
}

class _TermsCheckbox extends StatelessWidget {
  final bool accepted;
  final ValueChanged<bool> onChanged;
  const _TermsCheckbox({required this.accepted, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final linkStyle = TextStyle(
      color: WeretTokens.brand,
      fontWeight: FontWeight.w600,
      fontSize: 13,
      decoration: TextDecoration.underline,
      decorationColor: WeretTokens.brand.withValues(alpha: 0.4),
    );
    final baseStyle = TextStyle(
      color: accepted
          ? WeretTokens.textPrimary
          : WeretTokens.textSecondary,
      fontSize: 13,
      height: 1.4,
    );

    return GestureDetector(
      onTap: () => onChanged(!accepted),
      behavior: HitTestBehavior.opaque,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 1),
            child: SizedBox(
              width: 22,
              height: 22,
              child: Checkbox(
                value: accepted,
                onChanged: (v) => onChanged(v ?? false),
                activeColor: WeretTokens.brand,
                checkColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(6),
                  side: BorderSide(
                    color: accepted
                        ? WeretTokens.brand
                        : WeretTokens.border,
                  ),
                ),
                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                visualDensity: VisualDensity.compact,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: RichText(
              text: TextSpan(
                style: baseStyle,
                children: [
                  const TextSpan(text: 'I agree to the '),
                  TextSpan(
                    text: 'Terms of Service',
                    style: linkStyle,
                  ),
                  const TextSpan(text: ' and '),
                  TextSpan(
                    text: 'Privacy Policy',
                    style: linkStyle,
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

class _CountryCodeSelector extends StatelessWidget {
  final int selectedIndex;
  final List<_CountryCode> codes;
  final ValueChanged<int> onChanged;
  const _CountryCodeSelector({
    required this.selectedIndex,
    required this.codes,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 50,
      decoration: BoxDecoration(
        color: WeretTokens.inputFill,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: WeretTokens.borderSubtle),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<int>(
          value: selectedIndex,
          isDense: true,
          padding: const EdgeInsets.symmetric(horizontal: 10),
          dropdownColor: WeretTokens.surface,
          style: const TextStyle(fontSize: 15, color: WeretTokens.textPrimary),
          items: [
            for (int i = 0; i < codes.length; i++)
              DropdownMenuItem(
                value: i,
                child: Text('${codes[i].flag} ${codes[i].dialCode}'),
              ),
          ],
          onChanged: (v) {
            if (v != null) onChanged(v);
          },
        ),
      ),
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
