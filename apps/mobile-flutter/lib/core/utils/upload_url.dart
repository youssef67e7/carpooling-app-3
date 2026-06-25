import '../api/auth_interceptor.dart';

/// Resolves API-relative upload paths to absolute URLs for display.
class UploadUrl {
  const UploadUrl._();

  static String resolve(String? raw) {
    final s = raw?.trim() ?? '';
    if (s.isEmpty) return '';
    if (s.startsWith('http://') || s.startsWith('https://')) return s;
    if (s.startsWith('/')) return '${ApiConfig.baseUrl}$s';
    return s;
  }
}
