import 'package:easy_localization/easy_localization.dart';

final _emailRe = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');

String? validateName(String? value) {
  final v = value?.trim() ?? '';
  if (v.isEmpty) return 'authValidationNameRequired'.tr();
  if (v.length < 2) return 'authValidationNameShort'.tr();
  return null;
}

String? validateEmail(String? value) {
  final v = value?.trim() ?? '';
  if (v.isEmpty) return 'authValidationEmailRequired'.tr();
  if (!_emailRe.hasMatch(v)) return 'authValidationEmailInvalid'.tr();
  return null;
}

String? validatePassword(String? value) {
  final v = value ?? '';
  if (v.isEmpty) return 'authValidationPasswordRequired'.tr();
  if (v.length < 6) return 'authValidationPasswordMin'.tr();
  return null;
}

String? validatePasswordConfirm(String? value, String password) {
  if (value == null || value.isEmpty) return 'authValidationPasswordConfirmRequired'.tr();
  if (value != password) return 'authValidationPasswordMismatch'.tr();
  return null;
}

String? validatePhone(String? value, {bool required = false}) {
  final v = value?.trim() ?? '';
  if (v.isEmpty) return required ? 'authValidationPhoneRequired'.tr() : null;
  final digits = v.replaceAll(RegExp(r'\D'), '');
  if (digits.length < 8) return 'authValidationPhoneInvalid'.tr();
  return null;
}

String? validateOtp(String? value) {
  final v = value?.trim() ?? '';
  if (v.isEmpty) return 'authValidationOtpRequired'.tr();
  if (v.length < 4) return 'authValidationOtpInvalid'.tr();
  return null;
}

String? validateNationalId(String? value) {
  final v = value?.trim() ?? '';
  if (v.isEmpty) return 'authValidationNationalIdRequired'.tr();
  if (!RegExp(r'^[0-9]{10,20}$').hasMatch(v)) return 'authValidationNationalIdInvalid'.tr();
  return null;
}

String? validateRequired(String? value, {required String messageKey}) {
  if (value == null || value.trim().isEmpty) return messageKey.tr();
  return null;
}
