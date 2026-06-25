import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TokenManager {
  TokenManager._();

  static const _secureStorage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );

  static const _accessTokenKey = 'weret_token';
  static const _refreshTokenKey = 'weret_refresh_token';

  /// In-memory cache to avoid secure storage read on every API request.
  static String? _cachedAccessToken;

  static void Function()? onForceLogout;

  static Future<String?> getAccessToken() async {
    if (_cachedAccessToken != null) return _cachedAccessToken;
    try {
      _cachedAccessToken = await _secureStorage.read(key: _accessTokenKey);
    } catch (_) {
      return null;
    }
    return _cachedAccessToken;
  }

  static Future<String?> getRefreshToken() async {
    try {
      return await _secureStorage.read(key: _refreshTokenKey);
    } catch (_) {
      return null;
    }
  }

  static Future<({String? access, String? refresh})> getTokens() async {
    return (access: await getAccessToken(), refresh: await getRefreshToken());
  }

  static Future<bool> hasAccessToken() async {
    final token = await getAccessToken();
    return token != null && token.isNotEmpty;
  }

  static Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    _cachedAccessToken = accessToken;
    await _secureStorage.write(key: _accessTokenKey, value: accessToken);
    await _secureStorage.write(key: _refreshTokenKey, value: refreshToken);
  }

  static Future<void> saveAccessToken(String token) async {
    _cachedAccessToken = token;
    await _secureStorage.write(key: _accessTokenKey, value: token);
  }

  static Future<void> clearAll() async {
    _cachedAccessToken = null;
    await _secureStorage.delete(key: _accessTokenKey);
    await _secureStorage.delete(key: _refreshTokenKey);
  }
}
