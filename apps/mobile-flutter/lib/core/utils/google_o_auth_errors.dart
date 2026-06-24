import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/services.dart';

/// Maps Google Sign-In failures to localized WERET messages.
String mapGoogleSignInError(Object error) {
  if (error is PlatformException) {
    final code = error.code.toLowerCase();
    if (code.contains('cancel') || code == '12501') return 'weretGoogleCancelled'.tr();
    if (code.contains('developer') || code == '10') return 'weretGoogleDeveloperError'.tr();
    if (code == '12500') return 'weretGooglePlayServices'.tr();
  }

  final msg = error.toString().toLowerCase();
  if (msg.contains('cancel')) return 'weretGoogleCancelled'.tr();
  if (msg.contains('developer_error') || msg.contains('10:')) return 'weretGoogleDeveloperError'.tr();
  if (msg.contains('12501')) return 'weretGoogleCancelled'.tr();
  if (msg.contains('12500')) return 'weretGooglePlayServices'.tr();
  if (msg.contains('no id token') || msg.contains('idtoken')) return 'weretGoogleNoIdToken'.tr();
  if (msg.contains('not enabled') || msg.contains('503')) return 'weretGoogleServerDisabled'.tr();
  if (msg.contains('400') || msg.contains('policy')) return 'weretGooglePolicyBlocked'.tr();

  return 'weretGoogleErrorBody'.tr();
}
