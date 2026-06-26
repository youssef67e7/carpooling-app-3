import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class TokenManager {
  TokenManager._();

  static const _secureStorage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );

  static const _accessTokenKey = 'weret_token';
  static const _refreshTokenKey = 'weret_refresh_token';
  static const _accessTokenPrefsKey = 'weret_token_fallback';
  static const _refreshTokenPrefsKey = 'weret_refresh_token_fallback';

  /// In-memory cache to avoid storage read on every API request.
  static String? _cachedAccessToken;

  static void Function()? onForceLogout;

  static Future<String?> getAccessToken() async {
    if (_cachedAccessToken != null) return _cachedAccessToken;
    // Try secure storage first
    try {
      _cachedAccessToken = await _secureStorage.read(key: _accessTokenKey);
      if (_cachedAccessToken != null) return _cachedAccessToken;
    } catch (_) {
      // Fall through to SharedPreferences
    }
    // Fallback: SharedPreferences (some Android devices silently fail on secure storage)
    try {
      final prefs = await SharedPreferences.getInstance();
      _cachedAccessToken = prefs.getString(_accessTokenPrefsKey);
    } catch (_) {}
    return _cachedAccessToken;
  }

  static Future<String?> getRefreshToken() async {
    try {
      final rt = await _secureStorage.read(key: _refreshTokenKey);
      if (rt != null) return rt;
    } catch (_) {}
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString(_refreshTokenPrefsKey);
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
    await _writeToPrefs(accessToken, refreshToken);
  }

  static Future<void> saveAccessToken(String token) async {
    _cachedAccessToken = token;
    await _secureStorage.write(key: _accessTokenKey, value: token);
    await _writeToPrefs(token, null);
  }

  static Future<void> clearAll() async {
    _cachedAccessToken = null;
    await _secureStorage.delete(key: _accessTokenKey);
    await _secureStorage.delete(key: _refreshTokenKey);
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_accessTokenPrefsKey);
      await prefs.remove(_refreshTokenPrefsKey);
    } catch (_) {}
  }

  static Future<void> _writeToPrefs(String? accessToken, String? refreshToken) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (accessToken != null) await prefs.setString(_accessTokenPrefsKey, accessToken);
      if (refreshToken != null) await prefs.setString(_refreshTokenPrefsKey, refreshToken);
    } catch (_) {}
  }
}
