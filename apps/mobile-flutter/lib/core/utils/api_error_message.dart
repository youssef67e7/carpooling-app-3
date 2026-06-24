import 'package:dio/dio.dart';
import 'package:easy_localization/easy_localization.dart';

String apiErrorMessage(Object error, {String fallback = 'Request failed'}) {
  if (error is DioException) {
    final data = error.response?.data;
    if (data is Map && data['message'] != null) return '${data['message']}';
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
