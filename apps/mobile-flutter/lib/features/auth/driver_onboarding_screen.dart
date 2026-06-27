import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
import '../../shared/widgets/ui/form_error_callout.dart';
import '../../shared/widgets/weret_auth_scaffold.dart';
import '../../shared/models/weret_user.dart';
import '../driver/driver_shared_widgets.dart';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Step enum — replaces raw int for type-safe navigation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
enum _DriverStep { welcome, personal, vehicle, banking, account }

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Spacing & config
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const _xs = 8.0;
const _sm = 12.0;
const _md = 16.0;
const _lg = 24.0;
const _fieldGap = 14.0;
const _transitionMs = 350;

class DriverOnboardingScreen extends ConsumerStatefulWidget {
  const DriverOnboardingScreen({super.key, this.fromSignup = false});

  /// New driver signup — collect documents first, create account at the end.
  final bool fromSignup;

  @override
  ConsumerState<DriverOnboardingScreen> createState() =>
      _DriverOnboardingScreenState();
}

class _DriverOnboardingScreenState
    extends ConsumerState<DriverOnboardingScreen> {
  // ── Step ──────────────────────────────────────────────────────────
  _DriverStep _step = _DriverStep.welcome;

  // ── Per-step form keys (isolates validation between steps) ────────
  final _personalFormKey = GlobalKey<FormState>();
  final _vehicleFormKey = GlobalKey<FormState>();
  final _bankingFormKey = GlobalKey<FormState>();
  final _accountFormKey = GlobalKey<FormState>();

  // ── Controllers ───────────────────────────────────────────────────
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

  // ── Document URLs ─────────────────────────────────────────────────
  String? _criminalFrontUrl;
  String? _criminalBackUrl;
  String? _licenseImageUrl;
  String? _profileImageUrl;
  String? _carImageUrl;
  String? _registrationDocUrl;
  String? _insuranceDocUrl;

  // ── State ─────────────────────────────────────────────────────────
  int _year = DateTime.now().year;
  String _vehicleType = 'sedan';
  bool _bgConsent = false;
  bool _termsConsent = false;
  bool _accountTerms = false;
  bool _submitting = false;

  // ── Error handling ────────────────────────────────────────────────
  String? _localError;
  bool _errorDismissed = false;

  // ── Computed ──────────────────────────────────────────────────────
  bool get _anyLoading => _submitting || ref.read(authProvider).loading;

  // ── Lifecycle ─────────────────────────────────────────────────────
  @override
  void initState() {
    super.initState();
    final user = ref.read(authProvider).user;
    _licenseExpiry.text = DateTime.now()
        .add(const Duration(days: 365))
        .toIso8601String()
        .split('T')
        .first;
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
    for (final c in [
      _fullName, _nationalId, _licenseNumber, _licenseExpiry,
      _makeModel, _carColor, _carSeats, _plate,
      _bankName, _iban, _accountHolder,
      _email, _password, _confirm, _phone,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  // ── Navigation ────────────────────────────────────────────────────
  void _goTo(_DriverStep next) {
    HapticFeedback.selectionClick();
    setState(() {
      _step = next;
      _localError = null;
      _errorDismissed = false;
    });
  }

  void _back() {
    if (_anyLoading) return;
    final prev = switch (_step) {
      _DriverStep.personal => _DriverStep.welcome,
      _DriverStep.vehicle => _DriverStep.personal,
      _DriverStep.banking => _DriverStep.vehicle,
      _DriverStep.account => _DriverStep.banking,
      _DriverStep.welcome => null,
    };
    if (prev != null) {
      _goTo(prev);
    } else if (widget.fromSignup) {
      context.go('/register');
    } else {
      context.go('/passenger/home');
    }
  }

  // ── Error helpers ─────────────────────────────────────────────────
  void _setError(String? e) {
    if (e == null || e.isEmpty) return;
    HapticFeedback.heavyImpact();
    setState(() { _localError = e; _errorDismissed = false; });
  }

  void _dismissError() => setState(() => _errorDismissed = true);

  String? _displayError(String? providerError) {
    if (_errorDismissed) return null;
    return _localError ?? providerError;
  }

  // ── Doc readiness ─────────────────────────────────────────────────
  bool get _docsStep1Ready =>
      _criminalFrontUrl != null &&
      _criminalBackUrl != null &&
      _licenseImageUrl != null &&
      _profileImageUrl != null;

  bool get _docsStep2Ready =>
      _carImageUrl != null &&
      _registrationDocUrl != null &&
      _insuranceDocUrl != null;

  // ── Per-step validation ───────────────────────────────────────────
  bool _validatePersonal() {
    if (_personalFormKey.currentState?.validate() != true) {
      _setError('authValidationCheckFields'.tr());
      return false;
    }
    if (!_docsStep1Ready) {
      _setError('authUploadDocsRequired'.tr());
      return false;
    }
    return true;
  }

  bool _validateVehicle() {
    if (_vehicleFormKey.currentState?.validate() != true) {
      _setError('authValidationCheckFields'.tr());
      return false;
    }
    if (!_docsStep2Ready) {
      _setError('authUploadDocsRequired'.tr());
      return false;
    }
    return true;
  }

  bool _validateBanking() {
    if (_bankingFormKey.currentState?.validate() != true) {
      _setError('authValidationCheckFields'.tr());
      return false;
    }
    if (!_bgConsent || !_termsConsent) {
      _setError('driverConsentsRequired'.tr());
      return false;
    }
    return true;
  }

  bool _validateAccount() {
    if (_accountFormKey.currentState?.validate() != true) {
      _setError('authValidationCheckFields'.tr());
      return false;
    }
    if (!_accountTerms) {
      _setError('authTermsRequired'.tr());
      return false;
    }
    return true;
  }

  // ── Step advancement ──────────────────────────────────────────────
  void _next() {
    if (_anyLoading) return;
    HapticFeedback.selectionClick();

    final valid = switch (_step) {
      _DriverStep.welcome => true,
      _DriverStep.personal => _validatePersonal(),
      _DriverStep.vehicle => _validateVehicle(),
      _DriverStep.banking => _validateBanking(),
      _DriverStep.account => _validateAccount(),
    };
    if (!valid) return;

    switch (_step) {
      case _DriverStep.welcome:
        _goTo(_DriverStep.personal);
      case _DriverStep.personal:
        _goTo(_DriverStep.vehicle);
      case _DriverStep.vehicle:
        _goTo(_DriverStep.banking);
      case _DriverStep.banking:
        final needsAccount = widget.fromSignup && ref.read(authProvider).user == null;
        if (needsAccount) {
          _goTo(_DriverStep.account);
        } else {
          _submitApplication();
        }
      case _DriverStep.account:
        _registerAndSubmit();
    }
  }

  // ── Payload ───────────────────────────────────────────────────────
  List<String> _splitMakeModel() {
    final parts = _makeModel.text.trim().split(RegExp(r'\s+'));
    if (parts.length <= 1) return [parts.first, ''];
    return [parts.first, parts.sublist(1).join(' ')];
  }

  Map<String, dynamic> _applicationPayload(WeretUser user) {
    final mm = _splitMakeModel();
    return {
      'fullName': _fullName.text.trim(),
      'phone': _phone.text.trim().isNotEmpty
          ? _phone.text.trim()
          : (user.phone.isNotEmpty ? user.phone : '0000000000'),
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

  // ── Submit (existing user) ────────────────────────────────────────
  Future<void> _submitApplication() async {
    final user = ref.read(authProvider).user;
    if (user == null) {
      if (mounted) _goTo(_DriverStep.account);
      return;
    }
    setState(() => _submitting = true);
    ref.read(authProvider.notifier).clearError();
    try {
      await ref.read(authProvider.notifier).submitDriverApplication(_applicationPayload(user));
      if (mounted) context.go('/driver/application-received');
    } catch (e) {
      if (mounted) _setError(ref.read(authProvider).error ?? localizedApiError(e));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  // ── Register + submit (new user) ─────────────────────────────────
  Future<void> _registerAndSubmit() async {
    setState(() => _submitting = true);
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
        if (mounted) _setError('Account already exists. Please log in first.');
        if (mounted) context.go('/login');
        return;
      }
      if (mounted) _setError(errMsg);
      return;
    } finally {
      if (mounted) setState(() => _submitting = false);
    }

    final user = ref.read(authProvider).user;
    if (user == null) return;
    setState(() => _submitting = true);
    try {
      await ref.read(authProvider.notifier).submitDriverApplication(_applicationPayload(user));
      if (mounted) context.go('/driver/application-received');
    } catch (e) {
      if (mounted) _setError(ref.read(authProvider).error ?? localizedApiError(e));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BUILD
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final user = auth.user;
    final needsAccount = widget.fromSignup && user == null;
    final progressTotal = needsAccount ? 4 : 3;
    final progressValue = switch (_step) {
      _DriverStep.welcome => 0,
      _DriverStep.personal => 1,
      _DriverStep.vehicle => 2,
      _DriverStep.banking => 3,
      _DriverStep.account => 4,
    };
    final showProgress = _step != _DriverStep.welcome;

    return WeretAuthScaffold(
      flow: AuthFlow.driver,
      title: _step == _DriverStep.welcome ? null : _stepTitle(),
      showBack: _step != _DriverStep.welcome,
      onBack: _back,
      centerBrand: _step == _DriverStep.welcome,
      showBrand: _step == _DriverStep.welcome,
      showLanguage: _step == _DriverStep.welcome,
      stepLabel: showProgress
          ? (_step == _DriverStep.account
              ? 'registerDriverStepAccount'.tr()
              : 'registerDriverStepOnboarding'.tr(namedArgs: {
                  'step': '$progressValue',
                  'total': '$progressTotal',
                }))
          : null,
      subtitle: _stepSubtitle(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (showProgress) ...[
            LinearProgressIndicator(
              value: progressValue / progressTotal,
              backgroundColor: WeretTokens.border.withValues(alpha: 0.5),
              color: WeretTokens.brand,
              minHeight: 4,
            ),
            const SizedBox(height: _md),
          ],

          if (_displayError(auth.error) != null)
            Padding(
              padding: const EdgeInsets.only(bottom: _sm),
              child: FormErrorCallout(
                message: _displayError(auth.error)!,
                onDismiss: _dismissError,
              ),
            ),

          AnimatedSwitcher(
            duration: const Duration(milliseconds: _transitionMs),
            switchInCurve: Curves.easeOutCubic,
            switchOutCurve: Curves.easeInCubic,
            transitionBuilder: (child, animation) {
              final dir = animation.status == AnimationStatus.reverse
                  ? const Offset(0.04, 0)
                  : const Offset(-0.04, 0);
              return FadeTransition(
                opacity: animation,
                child: SlideTransition(
                  position: Tween(begin: dir, end: Offset.zero).animate(animation),
                  child: child,
                ),
              );
            },
            child: KeyedSubtree(
              key: ValueKey(_step),
              child: switch (_step) {
                _DriverStep.welcome => _buildWelcome(),
                _DriverStep.personal => Form(key: _personalFormKey, child: _buildPersonal()),
                _DriverStep.vehicle => Form(key: _vehicleFormKey, child: _buildVehicle()),
                _DriverStep.banking => Form(key: _bankingFormKey, child: _buildBanking(user)),
                _DriverStep.account => Form(key: _accountFormKey, child: _buildAccount()),
              },
            ),
          ),

          const SizedBox(height: _md),

          _buildActionButton(needsAccount),

          if (_step == _DriverStep.vehicle)
            Padding(
              padding: const EdgeInsets.only(top: _xs),
              child: TextButton(
                onPressed: _anyLoading ? null : _back,
                child: Text('driverBackPrevious'.tr()),
              ),
            ),
          if (_step == _DriverStep.personal)
            Padding(
              padding: const EdgeInsets.only(top: _xs),
              child: Text(
                'driverTermsFooter'.tr(),
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 11, color: WeretTokens.textSecondary, height: 1.4),
              ),
            ),
          if (_step == _DriverStep.account)
            Padding(
              padding: const EdgeInsets.only(top: _xs),
              child: TextButton(
                onPressed: _anyLoading ? null : () => context.go('/login'),
                child: Text('login'.tr()),
              ),
            ),
        ],
      ),
    );
  }

  String _stepTitle() => switch (_step) {
    _DriverStep.personal => 'becomeDriverTitle'.tr(),
    _DriverStep.vehicle => 'driverVehicleInfo'.tr(),
    _DriverStep.banking => 'driverBankingVerification'.tr(),
    _DriverStep.account => 'registerDriverTitle'.tr(),
    _DriverStep.welcome => '',
  };

  String? _stepSubtitle() => switch (_step) {
    _DriverStep.welcome => null,
    _DriverStep.banking => 'driverFinalStep'.tr(),
    _DriverStep.account => 'registerDriverSubtitle'.tr(),
    _ => 'driverOnboardingIntro'.tr(),
  };

  Widget _buildActionButton(bool needsAccount) {
    final label = switch (_step) {
      _DriverStep.welcome => 'registerNext'.tr(),
      _DriverStep.personal => 'driverContinueVehicle'.tr(),
      _DriverStep.vehicle => 'driverContinueFinal'.tr(),
      _DriverStep.banking => needsAccount ? 'registerNext'.tr() : 'driverSubmitApplication'.tr(),
      _DriverStep.account => 'registerDriverCreate'.tr(),
    };
    final isLoading = switch (_step) {
      _DriverStep.banking => !needsAccount && _anyLoading,
      _DriverStep.account => _anyLoading,
      _ => false,
    };
    return CustomButton(
      title: label,
      loading: isLoading,
      onPressed: _anyLoading ? null : _next,
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP BUILDERS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Widget _buildWelcome() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: _md),
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
          const SizedBox(height: _sm),
          Text(
            'registerDriverHint'.tr(),
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 13, color: WeretTokens.textSecondary, height: 1.45),
          ),
        ],
        SizedBox(height: widget.fromSignup ? _lg : _lg * 2),
        const DriverWordmark(),
        SizedBox(height: widget.fromSignup ? _lg : _lg * 2),
      ],
    );
  }

  Widget _buildPersonal() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('becomeDriverSubtitle'.tr(), style: const TextStyle(color: WeretTokens.textSecondary, height: 1.4)),
        const SizedBox(height: _md),
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
              const SizedBox(height: _sm),
              DriverInfoBanner(text: 'driverLicensePhotoHint'.tr()),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildVehicle() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('driverVehicleIntro'.tr(), style: const TextStyle(color: WeretTokens.textSecondary, height: 1.4)),
        const SizedBox(height: _md),
        DriverFormCard(
          icon: Icons.directions_car_outlined,
          title: 'driverVehicleIdentity'.tr(),
          child: Column(
            children: [
              AuthFormField(label: 'driverMakeModel'.tr(), controller: _makeModel, hint: 'driverMakeModelHint'.tr(), validator: (v) => validateRequired(v, messageKey: 'authValidationCarBrandRequired')),
              DropdownButtonFormField<int>(
                initialValue: _year,
                decoration: InputDecoration(
                  labelText: 'driverYear'.tr(),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(WeretTokens.fieldRadius)),
                ),
                items: List.generate(30, (i) {
                  final y = DateTime.now().year - i;
                  return DropdownMenuItem(value: y, child: Text('$y'));
                }),
                onChanged: (v) => setState(() => _year = v ?? _year),
              ),
              const SizedBox(height: _fieldGap),
              AuthFormField(label: 'driverCarColor'.tr(), controller: _carColor, validator: (v) => validateRequired(v, messageKey: 'driverRegErrCarColor')),
              const SizedBox(height: _fieldGap),
              AuthFormField(label: 'driverCarSeats'.tr(), controller: _carSeats, keyboardType: TextInputType.number, validator: (v) {
                final s = int.tryParse(v ?? '');
                if (s == null || s < 2 || s > 20) return 'driverCarSeatsInvalid'.tr();
                return null;
              }),
              const SizedBox(height: _fieldGap),
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
              const SizedBox(height: _sm),
              DriverInfoBanner(text: 'driverDocsExpiryHint'.tr()),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildBanking(WeretUser? user) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const _StepStepper(currentStep: 2),
        const SizedBox(height: _md),
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
        const SizedBox(height: _sm),
        _DriverCheckbox(value: _bgConsent, label: 'driverBgConsent'.tr(), onChanged: (v) => setState(() => _bgConsent = v)),
        _DriverCheckbox(value: _termsConsent, label: 'driverTermsConsent'.tr(), onChanged: (v) => setState(() => _termsConsent = v)),
        const SizedBox(height: _md),
        _ApplicationSummary(
          fullName: _fullName.text,
          email: user?.email ?? _email.text,
          makeModel: _makeModel.text,
          plate: _plate.text,
          onEditPersonal: () => _goTo(_DriverStep.personal),
          onEditVehicle: () => _goTo(_DriverStep.vehicle),
        ),
        const SizedBox(height: _sm),
        DriverInfoBanner(text: 'driverReviewTimeline'.tr()),
      ],
    );
  }

  Widget _buildAccount() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('registerDriverHint'.tr(), style: const TextStyle(fontSize: 13, height: 1.45, color: WeretTokens.textSecondary)),
        const SizedBox(height: _sm),
        AuthFormField(label: 'email'.tr(), controller: _email, keyboardType: TextInputType.emailAddress, validator: validateEmail, textInputAction: TextInputAction.next),
        AuthFormField(label: 'password'.tr(), controller: _password, obscure: true, validator: validatePassword, textInputAction: TextInputAction.next),
        AuthFormField(label: 'authPasswordConfirm'.tr(), controller: _confirm, obscure: true, validator: (v) => validatePasswordConfirm(v, _password.text), textInputAction: TextInputAction.next),
        AuthFormField(label: 'phone'.tr(), controller: _phone, keyboardType: TextInputType.phone, hint: 'phonePlaceholder'.tr(), validator: (v) => validatePhone(v, required: true), textInputAction: TextInputAction.done),
        _DriverCheckbox(value: _accountTerms, label: 'authTermsAccept'.tr(), onChanged: (v) => setState(() => _accountTerms = v)),
      ],
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Extracted widgets
// ═══════════════════════════════════════════════════════════════════════

/// Connected stepper dots with labels for the final step.
class _StepStepper extends StatelessWidget {
  final int currentStep;
  const _StepStepper({required this.currentStep});

  static const _labels = ['driverStepPersonal', 'driverVehicleInfo', 'driverVerification'];

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(3, (i) {
        final isActive = i == currentStep;
        final isPast = i < currentStep;
        final dotColor = (isActive || isPast) ? WeretTokens.brand : WeretTokens.border.withValues(alpha: 0.5);
        final lineColor = isPast ? WeretTokens.brand : WeretTokens.border.withValues(alpha: 0.5);

        return Expanded(
          child: Row(
            children: [
              if (i > 0) Expanded(child: Container(height: 2, color: lineColor)),
              Column(
                children: [
                  Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(color: dotColor, shape: BoxShape.circle),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _labels[i].tr(),
                    style: TextStyle(
                      fontSize: 9,
                      fontWeight: isActive ? FontWeight.w800 : FontWeight.w500,
                      color: (isActive || isPast) ? WeretTokens.brand : WeretTokens.textSecondary,
                    ),
                  ),
                ],
              ),
              if (i < 2) Expanded(child: Container(height: 2, color: lineColor)),
            ],
          ),
        );
      }),
    );
  }
}

/// Styled checkbox matching the app's design tokens.
class _DriverCheckbox extends StatelessWidget {
  final bool value;
  final String label;
  final ValueChanged<bool> onChanged;

  const _DriverCheckbox({required this.value, required this.label, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => onChanged(!value),
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: 22,
              height: 22,
              child: Checkbox(
                value: value,
                onChanged: (v) => onChanged(v ?? false),
                activeColor: WeretTokens.brand,
                checkColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(6),
                  side: BorderSide(color: value ? WeretTokens.brand : WeretTokens.border),
                ),
                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                visualDensity: VisualDensity.compact,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(child: Text(label, style: const TextStyle(fontSize: 13, height: 1.35))),
          ],
        ),
      ),
    );
  }
}

/// Summary card on the banking step with editable rows.
class _ApplicationSummary extends StatelessWidget {
  final String fullName;
  final String email;
  final String makeModel;
  final String plate;
  final VoidCallback onEditPersonal;
  final VoidCallback onEditVehicle;

  const _ApplicationSummary({
    required this.fullName,
    required this.email,
    required this.makeModel,
    required this.plate,
    required this.onEditPersonal,
    required this.onEditVehicle,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: WeretTokens.ambient,
        borderRadius: BorderRadius.circular(WeretTokens.fieldRadius),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('driverApplicationSummary'.tr(), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12, letterSpacing: 1)),
          const SizedBox(height: 10),
          _SummaryRow(title: 'driverProfilePersonal'.tr(), body: '$fullName\n$email', onEdit: onEditPersonal),
          _SummaryRow(title: 'driverVehicleInfo'.tr(), body: '$makeModel\n${'driverCarPlate'.tr()}: $plate', onEdit: onEditVehicle),
          Row(
            children: [
              const Icon(Icons.check_circle, color: WeretTokens.brand, size: 18),
              const SizedBox(width: 6),
              Text('driverIdentityUploaded'.tr(), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            ],
          ),
        ],
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final String title;
  final String body;
  final VoidCallback onEdit;

  const _SummaryRow({required this.title, required this.body, required this.onEdit});

  @override
  Widget build(BuildContext context) {
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
          TextButton(onPressed: onEdit, child: Text('edit'.tr())),
        ],
      ),
    );
  }
}
