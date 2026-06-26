import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/theme/weret_tokens.dart';
import '../../core/utils/api_error_message.dart';
import '../../core/utils/auth_validators.dart';
import '../../core/theme/auth_flow.dart';
import '../../shared/widgets/auth_form_field.dart';
import '../../shared/widgets/custom_button.dart';
import '../../shared/widgets/document_upload_field.dart';
import '../../shared/widgets/weret_auth_scaffold.dart';
import '../../shared/models/weret_user.dart';
import '../driver/driver_shared_widgets.dart';

/// Driver application: welcome → personal → vehicle → banking → (account) → submit.
class DriverOnboardingScreen extends ConsumerStatefulWidget {
  const DriverOnboardingScreen({super.key, this.fromSignup = false});

  /// New driver signup — collect documents first, create account at the end.
  final bool fromSignup;

  @override
  ConsumerState<DriverOnboardingScreen> createState() => _DriverOnboardingScreenState();
}

class _DriverOnboardingScreenState extends ConsumerState<DriverOnboardingScreen> {
  final _formKey = GlobalKey<FormState>();
  int _step = 0;

  final _fullName = TextEditingController();
  final _nationalId = TextEditingController();
  final _licenseNumber = TextEditingController();
  final _licenseExpiry = TextEditingController();
  final _makeModel = TextEditingController();
  final _carColor = TextEditingController(text: 'White');
  final _carSeats = TextEditingController(text: '4');
  final _plate = TextEditingController();
  final _bankName = TextEditingController();
  final _iban = TextEditingController();
  final _accountHolder = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  final _phone = TextEditingController();

  String? _criminalFrontUrl;
  String? _criminalBackUrl;
  String? _licenseImageUrl;
  String? _profileImageUrl;
  String? _carImageUrl;
  String? _registrationDocUrl;
  String? _insuranceDocUrl;

  int _year = DateTime.now().year;
  String _vehicleType = 'sedan';
  bool _bgConsent = false;
  bool _termsConsent = false;
  bool _accountTerms = false;

  bool get _needsAccountStep => widget.fromSignup && ref.read(authProvider).user == null;

  int get _progressTotal => _needsAccountStep ? 4 : 3;

  @override
  void initState() {
    super.initState();
    final user = ref.read(authProvider).user;
    _licenseExpiry.text = DateTime.now().add(const Duration(days: 365)).toIso8601String().split('T').first;
    if (user != null) {
      _fullName.text = user.name;
      _email.text = user.email;
      _phone.text = user.phone;
      if (user.profileImageUrl.isNotEmpty) _profileImageUrl = user.profileImageUrl;
      _accountHolder.text = user.name;
    }
  }

  @override
  void dispose() {
    _fullName.dispose();
    _nationalId.dispose();
    _licenseNumber.dispose();
    _licenseExpiry.dispose();
    _makeModel.dispose();
    _carColor.dispose();
    _carSeats.dispose();
    _plate.dispose();
    _bankName.dispose();
    _iban.dispose();
    _accountHolder.dispose();
    _email.dispose();
    _password.dispose();
    _confirm.dispose();
    _phone.dispose();
    super.dispose();
  }

  bool _docsStep1Ready() =>
      _criminalFrontUrl != null && _criminalBackUrl != null && _licenseImageUrl != null && _profileImageUrl != null;

  bool _docsStep2Ready() => _carImageUrl != null && _registrationDocUrl != null && _insuranceDocUrl != null;

  void _next() {
    if (!_formKey.currentState!.validate()) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('authValidationCheckFields'.tr())));
      return;
    }
    if (_step == 1 && !_docsStep1Ready()) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('authUploadDocsRequired'.tr())));
      return;
    }
    if (_step == 2 && !_docsStep2Ready()) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('authUploadDocsRequired'.tr())));
      return;
    }
    if (_step == 3) {
      if (!_bgConsent || !_termsConsent) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('driverConsentsRequired'.tr())));
        return;
      }
      if (_needsAccountStep) {
        setState(() => _step = 4);
        return;
      }
      _submitApplication();
      return;
    }
    if (_step == 4) {
      _registerAndSubmit();
      return;
    }
    setState(() => _step += 1);
  }

  void _back() {
    if (_step > 0) {
      setState(() => _step -= 1);
    } else if (widget.fromSignup) {
      context.go('/register');
    } else {
      context.go('/passenger/home');
    }
  }

  List<String> _splitMakeModel() {
    final parts = _makeModel.text.trim().split(RegExp(r'\s+'));
    if (parts.length <= 1) return [parts.first, ''];
    return [parts.first, parts.sublist(1).join(' ')];
  }

  Map<String, dynamic> _applicationPayload(WeretUser user) {
    final mm = _splitMakeModel();
    return {
      'fullName': _fullName.text.trim(),
      'phone': _phone.text.trim().isNotEmpty ? _phone.text.trim() : (user.phone.isNotEmpty ? user.phone : '0000000000'),
      'email': _email.text.trim().isNotEmpty ? _email.text.trim() : user.email,
      'profileImageUrl': _profileImageUrl!,
      'criminalRecordFrontUrl': _criminalFrontUrl!,
      'criminalRecordBackUrl': _criminalBackUrl!,
      'nationalIdNumber': _nationalId.text.trim(),
      'licenseImageUrl': _licenseImageUrl!,
      'licenseNumber': _licenseNumber.text.trim(),
      'licenseExpiry': _licenseExpiry.text.trim(),
      'payoutBankName': _bankName.text.trim(),
      'payoutAccountNumber': _iban.text.trim(),
      'payoutAccountHolder': _accountHolder.text.trim(),
      'backgroundCheckConsent': _bgConsent,
      'termsAccepted': _termsConsent,
      'cars': [
        {
          'imageUrl': _carImageUrl!,
          'brand': mm[0],
          'model': mm[1].isEmpty ? mm[0] : mm[1],
          'color': _carColor.text.trim(),
          'plateNumber': _plate.text.trim(),
          'seats': int.tryParse(_carSeats.text.trim()) ?? 4,
          'carCategory': _vehicleType,
          'year': _year,
          'registrationDocUrl': _registrationDocUrl,
          'insuranceDocUrl': _insuranceDocUrl,
        },
      ],
    };
  }

  Future<void> _submitApplication() async {
    final user = ref.read(authProvider).user;
    if (user == null) {
      if (mounted) setState(() => _step = 4);
      return;
    }
    try {
      await ref.read(authProvider.notifier).submitDriverApplication(_applicationPayload(user));
      if (mounted) context.go('/driver/application-received');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(ref.read(authProvider).error ?? localizedApiError(e))),
        );
      }
    }
  }

  Future<void> _registerAndSubmit() async {
    if (!_accountTerms) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('authTermsRequired'.tr())));
      return;
    }
    ref.read(authProvider.notifier).clearError();
    try {
      await ref.read(authProvider.notifier).register({
        'name': _fullName.text.trim(),
        'email': _email.text.trim(),
        'password': _password.text,
        'phone': _phone.text.trim(),
      });
    } catch (e) {
      final errMsg = ref.read(authProvider).error ?? localizedApiError(e);
      if (errMsg.contains('already registered') || errMsg.contains('409')) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Account already exists. Please log in first.')),
          );
        }
        if (mounted) context.go('/login');
        return;
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(errMsg)));
      }
      return;
    }
    final user = ref.read(authProvider).user;
    if (user == null) return;
    await ref.read(authProvider.notifier).submitDriverApplication(_applicationPayload(user));
    if (mounted) context.go('/driver/application-received');
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).user;
    final loading = ref.watch(authProvider).loading;
    final needsAccount = widget.fromSignup && user == null;
    final progressStep = _step == 0 ? 0 : _step;
    final showProgress = _step > 0 && _step <= _progressTotal;

    return WeretAuthScaffold(
      flow: AuthFlow.driver,
      title: _step == 0 ? null : _stepTitle(),
      showBack: _step > 0,
      onBack: _back,
      centerBrand: _step == 0,
      showBrand: _step == 0,
      showLanguage: _step == 0,
      stepLabel: showProgress
          ? (_step == 4
              ? 'registerDriverStepAccount'.tr()
              : 'registerDriverStepOnboarding'.tr(namedArgs: {'step': '$progressStep', 'total': '$_progressTotal'}))
          : null,
      subtitle: _step == 0
          ? null
          : _step == 3
              ? 'driverFinalStep'.tr()
              : _step == 4
                  ? 'registerDriverSubtitle'.tr()
                  : 'driverOnboardingIntro'.tr(),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (showProgress) ...[
              LinearProgressIndicator(
                value: progressStep / _progressTotal,
                backgroundColor: WeretTokens.border.withValues(alpha: 0.5),
                color: WeretTokens.brand,
              ),
              const SizedBox(height: 12),
            ],
            switch (_step) {
              0 => _welcomeStep(),
              1 => _personalStep(),
              2 => _vehicleStep(),
              3 => _bankingStep(user),
              _ => _accountStep(),
            },
            const SizedBox(height: 16),
            if (_step == 0)
              CustomButton(title: 'registerNext'.tr(), onPressed: () => setState(() => _step = 1))
            else if (_step == 3)
              CustomButton(
                title: needsAccount ? 'registerNext'.tr() : 'driverSubmitApplication'.tr(),
                loading: !needsAccount && loading,
                onPressed: _next,
              )
            else if (_step == 4)
              CustomButton(title: 'registerDriverCreate'.tr(), loading: loading, onPressed: _next)
            else
              CustomButton(
                title: _step == 1 ? 'driverContinueVehicle'.tr() : 'driverContinueFinal'.tr(),
                onPressed: _next,
              ),
            if (_step == 2) ...[
              const SizedBox(height: 8),
              TextButton(onPressed: _back, child: Text('driverBackPrevious'.tr())),
            ],
            if (_step == 1)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  'driverTermsFooter'.tr(),
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 11, color: WeretTokens.textSecondary, height: 1.4),
                ),
              ),
            if (_step == 4) ...[
              WeretLinkButton(title: 'registerDriverPhone'.tr(), onPressed: () => context.push('/register/driver/phone')),
              WeretLinkButton(title: 'login'.tr(), onPressed: () => context.go('/login')),
            ],
          ],
        ),
      ),
    );
  }

  String _stepTitle() {
    switch (_step) {
      case 1:
        return 'becomeDriverTitle'.tr();
      case 2:
        return 'driverVehicleInfo'.tr();
      case 3:
        return 'driverBankingVerification'.tr();
      case 4:
        return 'registerDriverTitle'.tr();
      default:
        return '';
    }
  }

  Widget _welcomeStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 16),
        Text(
          widget.fromSignup ? 'registerDriverPathBody'.tr() : 'driverWelcomeFamily'.tr(),
          textAlign: TextAlign.center,
          style: TextStyle(
            fontWeight: widget.fromSignup ? FontWeight.w600 : FontWeight.w900,
            fontSize: widget.fromSignup ? 15 : 28,
            color: widget.fromSignup ? WeretTokens.textPrimary : null,
            height: 1.45,
          ),
        ),
        if (widget.fromSignup) ...[
          const SizedBox(height: 12),
          Text(
            'registerDriverHint'.tr(),
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 13, color: WeretTokens.textSecondary, height: 1.45),
          ),
        ],
        SizedBox(height: widget.fromSignup ? 28 : 48),
        const DriverWordmark(),
        SizedBox(height: widget.fromSignup ? 32 : 48),
      ],
    );
  }

  Widget _accountStep() {
    final error = ref.watch(authProvider).error;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('registerDriverHint'.tr(), style: const TextStyle(fontSize: 13, height: 1.45, color: WeretTokens.textSecondary)),
        const SizedBox(height: 12),
        if (error != null && error.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(error, style: TextStyle(color: Colors.red.shade700, fontSize: 13)),
          ),
        AuthFormField(label: 'email'.tr(), controller: _email, keyboardType: TextInputType.emailAddress, validator: validateEmail, textInputAction: TextInputAction.next),
        AuthFormField(label: 'password'.tr(), controller: _password, obscure: true, validator: validatePassword, textInputAction: TextInputAction.next),
        AuthFormField(
          label: 'authPasswordConfirm'.tr(),
          controller: _confirm,
          obscure: true,
          validator: (v) => validatePasswordConfirm(v, _password.text),
          textInputAction: TextInputAction.next,
        ),
        AuthFormField(label: 'phone'.tr(), controller: _phone, keyboardType: TextInputType.phone, hint: 'phonePlaceholder'.tr(), validator: (v) => validatePhone(v, required: true), textInputAction: TextInputAction.done),
        CheckboxListTile(
          contentPadding: EdgeInsets.zero,
          value: _accountTerms,
          onChanged: (v) => setState(() => _accountTerms = v ?? false),
          title: Text('authTermsAccept'.tr(), style: const TextStyle(fontSize: 13, height: 1.35)),
          controlAffinity: ListTileControlAffinity.leading,
        ),
      ],
    );
  }

  Widget _personalStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('becomeDriverSubtitle'.tr(), style: const TextStyle(color: WeretTokens.textSecondary, height: 1.4)),
        const SizedBox(height: 16),
        DriverFormCard(
          icon: Icons.person_outline,
          title: 'driverProfilePersonal'.tr(),
          child: Column(
            children: [
              AuthFormField(label: 'fullName'.tr(), controller: _fullName, validator: (v) => validateRequired(v, messageKey: 'authValidationNameRequired')),
              AuthFormField(label: 'driverOnboardingNationalId'.tr(), controller: _nationalId, keyboardType: TextInputType.number, validator: validateNationalId),
            ],
          ),
        ),
        DriverFormCard(
          icon: Icons.badge_outlined,
          title: 'driverOnboardingLicenseTitle'.tr(),
          child: Column(
            children: [
              AuthFormField(label: 'driverOnboardingLicenseNumber'.tr(), controller: _licenseNumber, validator: (v) => validateRequired(v, messageKey: 'authValidationLicenseRequired')),
              AuthFormField(label: 'driverOnboardingLicenseExpiry'.tr(), controller: _licenseExpiry, hint: 'YYYY-MM-DD', validator: (v) => validateRequired(v, messageKey: 'authValidationLicenseExpiryRequired')),
              DocumentUploadField(label: 'driverLicensePhotoFront'.tr(), url: _licenseImageUrl, onChanged: (v) => setState(() => _licenseImageUrl = v)),
              DocumentUploadField(label: 'driverOnboardingCriminalRecord'.tr(), url: _criminalFrontUrl, onChanged: (v) => setState(() => _criminalFrontUrl = v)),
              DocumentUploadField(label: 'driverOnboardingCriminalBack'.tr(), url: _criminalBackUrl, onChanged: (v) => setState(() => _criminalBackUrl = v)),
              DocumentUploadField(label: 'profilePhoto'.tr(), url: _profileImageUrl, visibility: 'public', onChanged: (v) => setState(() => _profileImageUrl = v)),
              const SizedBox(height: 8),
              DriverInfoBanner(text: 'driverLicensePhotoHint'.tr()),
            ],
          ),
        ),
      ],
    );
  }

  Widget _vehicleStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('driverVehicleIntro'.tr(), style: const TextStyle(color: WeretTokens.textSecondary, height: 1.4)),
        const SizedBox(height: 16),
        DriverFormCard(
          icon: Icons.directions_car_outlined,
          title: 'driverVehicleIdentity'.tr(),
          child: Column(
            children: [
              AuthFormField(label: 'driverMakeModel'.tr(), controller: _makeModel, hint: 'driverMakeModelHint'.tr(), validator: (v) => validateRequired(v, messageKey: 'authValidationCarBrandRequired')),
              DropdownButtonFormField<int>(
                value: _year,
                decoration: InputDecoration(labelText: 'driverYear'.tr(), border: OutlineInputBorder(borderRadius: BorderRadius.circular(WeretTokens.fieldRadius))),
                items: List.generate(30, (i) {
                  final y = DateTime.now().year - i;
                  return DropdownMenuItem(value: y, child: Text('$y'));
                }),
                onChanged: (v) => setState(() => _year = v ?? _year),
              ),
              const SizedBox(height: 12),
              AuthFormField(label: 'driverCarColor'.tr(), controller: _carColor, validator: (v) => validateRequired(v, messageKey: 'driverRegErrCarColor')),
              const SizedBox(height: 12),
              AuthFormField(label: 'driverCarSeats'.tr(), controller: _carSeats, keyboardType: TextInputType.number, validator: (v) {
                final s = int.tryParse(v ?? '');
                if (s == null || s < 2 || s > 20) return 'driverCarSeatsInvalid'.tr();
                return null;
              }),
              const SizedBox(height: 12),
              AuthFormField(label: 'driverCarPlate'.tr(), controller: _plate, validator: (v) => validateRequired(v, messageKey: 'authValidationCarPlateRequired')),
            ],
          ),
        ),
        DriverFormCard(
          icon: Icons.category_outlined,
          title: 'driverVehicleType'.tr(),
          child: Row(
            children: [
              DriverVehicleTypeCard(label: 'driverTypeSedan'.tr(), icon: Icons.directions_car, selected: _vehicleType == 'sedan', onTap: () => setState(() => _vehicleType = 'sedan')),
              DriverVehicleTypeCard(label: 'driverTypeSuv'.tr(), icon: Icons.airport_shuttle, selected: _vehicleType == 'suv', onTap: () => setState(() => _vehicleType = 'suv')),
              DriverVehicleTypeCard(label: 'driverTypeElectric'.tr(), icon: Icons.electric_car, selected: _vehicleType == 'electric', onTap: () => setState(() => _vehicleType = 'electric')),
            ],
          ),
        ),
        DriverFormCard(
          icon: Icons.description_outlined,
          title: 'driverRequiredDocuments'.tr(),
          child: Column(
            children: [
              DocumentUploadField(label: 'driverVehiclePhoto'.tr(), url: _carImageUrl, visibility: 'public', onChanged: (v) => setState(() => _carImageUrl = v)),
              DocumentUploadField(label: 'driverRegistrationDoc'.tr(), url: _registrationDocUrl, onChanged: (v) => setState(() => _registrationDocUrl = v)),
              DocumentUploadField(label: 'driverInsuranceDoc'.tr(), url: _insuranceDocUrl, onChanged: (v) => setState(() => _insuranceDocUrl = v)),
              const SizedBox(height: 8),
              DriverInfoBanner(text: 'driverDocsExpiryHint'.tr()),
            ],
          ),
        ),
      ],
    );
  }

  Widget _bankingStep(WeretUser? user) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _stepChip('driverStepPersonal'.tr(), false),
            _stepChip('driverVehicleInfo'.tr(), false),
            _stepChip('driverVerification'.tr(), true),
          ],
        ),
        const SizedBox(height: 16),
        DriverFormCard(
          icon: Icons.account_balance_outlined,
          title: 'driverPayoutMethod'.tr(),
          child: Column(
            children: [
              AuthFormField(label: 'driverBankName'.tr(), controller: _bankName, validator: (v) => validateRequired(v, messageKey: 'driverBankRequired')),
              AuthFormField(label: 'driverIban'.tr(), controller: _iban, validator: (v) => validateRequired(v, messageKey: 'driverIbanRequired')),
              AuthFormField(label: 'driverAccountHolder'.tr(), controller: _accountHolder, validator: (v) => validateRequired(v, messageKey: 'authValidationNameRequired')),
              Text('driverPayoutHint'.tr(), style: const TextStyle(fontSize: 12, color: WeretTokens.textSecondary)),
            ],
          ),
        ),
        CheckboxListTile(
          value: _bgConsent,
          onChanged: (v) => setState(() => _bgConsent = v ?? false),
          title: Text('driverBgConsent'.tr(), style: const TextStyle(fontSize: 13)),
          controlAffinity: ListTileControlAffinity.leading,
          contentPadding: EdgeInsets.zero,
        ),
        CheckboxListTile(
          value: _termsConsent,
          onChanged: (v) => setState(() => _termsConsent = v ?? false),
          title: Text('driverTermsConsent'.tr(), style: const TextStyle(fontSize: 13)),
          controlAffinity: ListTileControlAffinity.leading,
          contentPadding: EdgeInsets.zero,
        ),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: WeretTokens.ambient, borderRadius: BorderRadius.circular(WeretTokens.fieldRadius)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('driverApplicationSummary'.tr(), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12, letterSpacing: 1)),
              const SizedBox(height: 10),
              _summaryRow('driverProfilePersonal'.tr(), '${_fullName.text}\n${user?.email ?? _email.text}'),
              _summaryRow('driverVehicleInfo'.tr(), '${_makeModel.text}\n${'driverCarPlate'.tr()}: ${_plate.text}'),
              Row(
                children: [
                  const Icon(Icons.check_circle, color: WeretTokens.brand, size: 18),
                  const SizedBox(width: 6),
                  Text('driverIdentityUploaded'.tr(), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        DriverInfoBanner(text: 'driverReviewTimeline'.tr()),
      ],
    );
  }

  Widget _stepChip(String label, bool active) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: Column(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(color: active ? WeretTokens.brand : WeretTokens.border, shape: BoxShape.circle),
          ),
          const SizedBox(height: 4),
          Text(label, style: TextStyle(fontSize: 9, fontWeight: active ? FontWeight.w800 : FontWeight.w500, color: active ? WeretTokens.brand : WeretTokens.textSecondary)),
        ],
      ),
    );
  }

  Widget _summaryRow(String title, String body) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: WeretTokens.textSecondary)),
                Text(body, style: const TextStyle(fontWeight: FontWeight.w600, height: 1.35)),
              ],
            ),
          ),
          TextButton(onPressed: () => setState(() => _step = title.contains('Vehicle') || title.contains('مركبة') ? 2 : 1), child: Text('edit'.tr())),
        ],
      ),
    );
  }
}
