import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/theme/weret_tokens.dart';
import '../../core/utils/api_error_message.dart';
import '../../core/utils/auth_validators.dart';
import '../../core/theme/auth_flow.dart';
import '../../shared/widgets/auth_form_field.dart';
import '../../shared/widgets/custom_button.dart';
import '../../shared/widgets/weret_auth_scaffold.dart';
import '../../shared/widgets/weret_logo.dart';

class PassengerRegisterScreen extends ConsumerStatefulWidget {
  const PassengerRegisterScreen({super.key});
  @override
  ConsumerState<PassengerRegisterScreen> createState() => _PassengerRegisterScreenState();
}

class _PassengerRegisterScreenState extends ConsumerState<PassengerRegisterScreen> {
  int _step = 0;
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  final _phone = TextEditingController();
  bool _acceptedTerms = false;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    _confirm.dispose();
    _phone.dispose();
    super.dispose();
  }

  void _back() {
    if (_step > 0) {
      setState(() => _step -= 1);
    } else {
      context.pop();
    }
  }

  Future<void> _submit() async {
    ref.read(authProvider.notifier).clearError();
    if (!_acceptedTerms) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('authTermsRequired'.tr())));
      return;
    }
    if (!_formKey.currentState!.validate()) return;
    try {
      await ref.read(authProvider.notifier).register({
        'name': _name.text.trim(),
        'email': _email.text.trim(),
        'password': _password.text,
        'phone': _phone.text.trim(),
      });
      if (mounted) context.go('/passenger/home');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(ref.read(authProvider).error ?? localizedApiError(e))),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final loading = ref.watch(authProvider).loading;
    final isWelcome = _step == 0;

    return WeretAuthScaffold(
      flow: AuthFlow.passenger,
      title: isWelcome ? null : 'registerPassengerTitle'.tr(),
      stepLabel: isWelcome ? null : 'registerPassengerStepAccount'.tr(),
      showBack: true,
      onBack: _back,
      centerBrand: isWelcome,
      showBrand: isWelcome,
      showLanguage: isWelcome,
      subtitle: isWelcome ? null : 'registerPassengerSubtitle'.tr(),
      child: isWelcome ? _welcomeStep() : _accountStep(loading),
    );
  }

  Widget _welcomeStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 16),
        Text(
          'registerPassengerPathBody'.tr(),
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: WeretTokens.textPrimary, height: 1.45),
        ),
        const SizedBox(height: 28),
        const Center(child: WeretLogo.onLight()),
        const SizedBox(height: 32),
        CustomButton(title: 'registerNext'.tr(), onPressed: () => setState(() => _step = 1)),
      ],
    );
  }

  Widget _accountStep(bool loading) {
    final error = ref.watch(authProvider).error;
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (error != null && error.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(error, style: TextStyle(color: Colors.red.shade700, fontSize: 13)),
            ),
          AuthFormField(label: 'name'.tr(), controller: _name, validator: validateName, textInputAction: TextInputAction.next),
          AuthFormField(label: 'email'.tr(), controller: _email, keyboardType: TextInputType.emailAddress, validator: validateEmail, textInputAction: TextInputAction.next),
          AuthFormField(label: 'password'.tr(), controller: _password, obscure: true, validator: validatePassword, textInputAction: TextInputAction.next),
          AuthFormField(
            label: 'authPasswordConfirm'.tr(),
            controller: _confirm,
            obscure: true,
            validator: (v) => validatePasswordConfirm(v, _password.text),
            textInputAction: TextInputAction.next,
          ),
          AuthFormField(label: 'phone'.tr(), controller: _phone, keyboardType: TextInputType.phone, hint: 'phonePlaceholder'.tr(), validator: (v) => validatePhone(v), textInputAction: TextInputAction.done),
          CheckboxListTile(
            contentPadding: EdgeInsets.zero,
            value: _acceptedTerms,
            onChanged: (v) => setState(() => _acceptedTerms = v ?? false),
            title: Text('authTermsAccept'.tr(), style: const TextStyle(fontSize: 13, height: 1.35)),
            controlAffinity: ListTileControlAffinity.leading,
          ),
          CustomButton(title: 'registerPassengerCreate'.tr(), loading: loading, onPressed: _submit),
          WeretLinkButton(title: 'registerPassengerPhone'.tr(), onPressed: () => context.push('/register/passenger/phone')),
          WeretLinkButton(title: 'login'.tr(), onPressed: () => context.go('/login')),
        ],
      ),
    );
  }
}
