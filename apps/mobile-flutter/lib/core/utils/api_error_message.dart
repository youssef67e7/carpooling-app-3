import 'package:dio/dio.dart';
import 'package:easy_localization/easy_localization.dart';

String apiErrorMessage(Object error, {String fallback = 'Request failed'}) {
  if (error is DioException) {
    final data = error.response?.data;
    if (data is Map) {
      if (data['message'] != null) return '${data['message']}';
      if (data['error'] is Map && (data['error'] as Map)['message'] != null) {
        return '${(data['error'] as Map)['message']}';
      }
    }
    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.connectionError) {
      return 'connectionApiDownShort';
    }
    return error.message ?? fallback;
  }
  return error.toString();
}

/// Same as [apiErrorMessage] but translates known keys and auth status messages.
String localizedApiError(Object error, {String? fallbackKey}) {
  final raw = apiErrorMessage(error, fallback: fallbackKey ?? 'error');
  if (raw == 'connectionApiDownShort') return 'connectionApiDownShort'.tr();

  final lower = raw.toLowerCase();
  if (lower.contains('pending admin approval')) return 'authPendingApproval'.tr();
  if (lower.contains('account blocked')) return 'authAccountBlocked'.tr();
  if (lower.contains('account suspended')) return 'authAccountSuspended'.tr();
  if (lower.contains('google sign-in')) return 'weretGoogleErrorBody'.tr();
  if (lower.contains('uses google sign-in')) return 'authUseGoogleInstead'.tr();
  if (lower.contains('invalid image url')) return 'This image URL is not valid — please re-upload.';
  if (lower.contains('already registered')) return 'This email is already registered.';
  if (lower.contains('email mismatch')) return 'Email does not match your account.';
  if (lower.contains('license expiry')) return 'License expiry must be a future date.';
  if (lower.contains('car details missing')) return 'Please complete all car details.';

  return raw;
}

String? authBannerKeyForError(String? error) {
  if (error == null) return null;
  final lower = error.toLowerCase();
  if (lower.contains('pending admin approval')) return 'authPendingApproval';
  if (lower.contains('account blocked')) return 'authAccountBlocked';
  if (lower.contains('account suspended')) return 'authAccountSuspended';
  return null;
}
