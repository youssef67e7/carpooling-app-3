import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/api_client.dart';
import '../api/api_endpoints.dart';
import '../services/session_reset.dart';
import '../services/token_manager.dart';
import '../utils/api_error_message.dart';
import '../../shared/models/weret_user.dart';

const _userCacheKey = 'weret_user_cache';
const _postRegisterDriverKey = 'post_register_driver_onboarding';

GoogleSignIn? _googleSignInInstance;

class AuthState {
  const AuthState({
    this.user,
    this.token,
    this.hydrated = false,
    this.loading = false,
    this.error,
    this.googleWebClientId,
    this.googleSignInEnabled = false,
  });

  final WeretUser? user;
  final String? token;
  final bool hydrated;
  final bool loading;
  final String? error;
  final String? googleWebClientId;
  final bool googleSignInEnabled;

  bool get isAuthenticated => token != null && token!.isNotEmpty;

  AuthState copyWith({
    WeretUser? user,
    String? token,
    bool? hydrated,
    bool? loading,
    String? error,
    String? googleWebClientId,
    bool? googleSignInEnabled,
    bool clearError = false,
  }) {
    return AuthState(
      user: user ?? this.user,
      token: token ?? this.token,
      hydrated: hydrated ?? this.hydrated,
      loading: loading ?? this.loading,
      error: clearError ? null : (error ?? this.error),
      googleWebClientId: googleWebClientId ?? this.googleWebClientId,
      googleSignInEnabled: googleSignInEnabled ?? this.googleSignInEnabled,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier(this._ref) : super(const AuthState());

  final Ref _ref;

  Future<ApiClient> get _api async => _ref.read(apiClientProvider.future);

  Future<void> hydrate() async {
    await _loadGoogleConfig();
    final token = await TokenManager.getAccessToken();
    if (token == null || token.isEmpty) {
      state = state.copyWith(hydrated: true);
      return;
    }
    WeretUser? user;
    final prefs = await SharedPreferences.getInstance();
    final cached = prefs.getString(_userCacheKey);
    if (cached != null) {
      try {
        user = WeretUser.fromJson(jsonDecode(cached) as Map<String, dynamic>);
      } catch (_) {}
    }
    state = state.copyWith(token: token, user: user, hydrated: true);
    try {
      final api = await _api;
      final data = await api.getJson(ApiEndpoints.authMe);
      final freshUser = WeretUser.fromJson(data['user'] as Map<String, dynamic>? ?? data);
      await _cacheUser(freshUser);
      state = state.copyWith(user: freshUser, clearError: true);
    } catch (e) {
      final msg = localizedApiError(e);
      await clearLocalSession();
      state = state.copyWith(error: msg, hydrated: true);
    }
  }

  int _googleConfigRetryCount = 0;

  Future<void> _loadGoogleConfig() async {
    try {
      final api = await _api;
      final data = await api.getJson(ApiEndpoints.authGoogleConfig);
      final webId = '${data['webClientId'] ?? ''}'.trim();
      state = state.copyWith(
        googleWebClientId: webId.isNotEmpty ? webId : null,
        googleSignInEnabled: data['enabled'] == true,
      );
      _googleConfigRetryCount = 0;
    } catch (_) {
      _scheduleGoogleConfigRetry();
    }
  }

  Future<void> retryLoadGoogleConfig() async {
    _scheduleGoogleConfigRetry(retryNow: true);
  }

  void _scheduleGoogleConfigRetry({bool retryNow = false}) {
    if (retryNow) {
      _loadGoogleConfig();
      return;
    }
    _googleConfigRetryCount++;
    final delay = _googleConfigRetryCount <= 3
        ? Duration(seconds: _googleConfigRetryCount * 5)
        : const Duration(seconds: 60);
    Future.delayed(delay, () async {
      if (state.googleSignInEnabled) return;
      await _loadGoogleConfig();
    });
  }

  GoogleSignIn get googleSignIn {
    _googleSignInInstance ??= GoogleSignIn(
      scopes: const ['email', 'profile', 'openid'],
      serverClientId: _resolveGoogleWebClientId(),
    );
    return _googleSignInInstance!;
  }

  String? _resolveGoogleWebClientId() {
    const fromEnv = String.fromEnvironment('GOOGLE_WEB_CLIENT_ID');
    if (fromEnv.isNotEmpty) return fromEnv;
    final fromServer = state.googleWebClientId;
    if (fromServer != null && fromServer.isNotEmpty) return fromServer;
    return null;
  }

  Future<void> clearLocalSession() async {
    await TokenManager.clearAll();
    resetSessionProviders(_ref);
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_userCacheKey);
    state = AuthState(
      hydrated: true,
      googleWebClientId: state.googleWebClientId,
      googleSignInEnabled: state.googleSignInEnabled,
    );
  }

  Future<void> validateSession() async {
    try {
      final api = await _api;
      final data = await api.getJson(ApiEndpoints.authMe);
      final user = WeretUser.fromJson(data['user'] as Map<String, dynamic>? ?? data);
      await _cacheUser(user);
      state = state.copyWith(user: user, clearError: true);
    } catch (_) {
      await clearLocalSession();
    }
  }

  Future<void> _cacheUser(WeretUser user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_userCacheKey, jsonEncode(user.toJson()));
  }

  Future<void> applySession({required String token, String? refreshToken, required WeretUser user}) async {
    if (refreshToken != null && refreshToken.isNotEmpty) {
      await TokenManager.saveTokens(accessToken: token, refreshToken: refreshToken);
    } else {
      await TokenManager.saveAccessToken(token);
    }
    await _cacheUser(user);
    state = state.copyWith(token: token, user: user, clearError: true, loading: false);
  }

  Future<void> loginEmail(String email, String password) async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      final api = await _api;
      final data = await api.postJson(ApiEndpoints.authLogin, {'email': email, 'password': password});
      final token = '${data['accessToken'] ?? data['token'] ?? ''}';
      final refreshToken = '${data['refreshToken'] ?? ''}';
      final user = WeretUser.fromJson(data['user'] as Map<String, dynamic>);
      await applySession(token: token, refreshToken: refreshToken, user: user);
    } catch (e) {
      state = state.copyWith(loading: false, error: localizedApiError(e, fallbackKey: 'error'));
      rethrow;
    }
  }

  Future<void> register(Map<String, dynamic> body, {bool driverOnboardingAfter = false}) async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      final api = await _api;
      final payload = Map<String, dynamic>.from(body)..remove('role');
      final data = await api.postJson(ApiEndpoints.authRegister, payload);
      final token = '${data['accessToken'] ?? data['token'] ?? ''}';
      final refreshToken = '${data['refreshToken'] ?? ''}';
      final user = WeretUser.fromJson(data['user'] as Map<String, dynamic>);
      if (driverOnboardingAfter) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(_postRegisterDriverKey, '1');
      }
      await applySession(token: token, refreshToken: refreshToken, user: user);
    } catch (e) {
      state = state.copyWith(loading: false, error: localizedApiError(e, fallbackKey: 'error'));
      rethrow;
    }
  }

  static Future<bool> consumePostRegisterDriverFlag() async {
    final prefs = await SharedPreferences.getInstance();
    final v = prefs.getString(_postRegisterDriverKey);
    if (v != null) {
      await prefs.remove(_postRegisterDriverKey);
      return true;
    }
    return false;
  }

  Future<Map<String, dynamic>?> fetchDriverApplication() async {
    try {
      final api = await _api;
      return await api.getJson(ApiEndpoints.driverApplicationMe);
    } catch (_) {
      return null;
    }
  }

  Future<void> submitDriverApplication(Map<String, dynamic> body) async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      final api = await _api;
      final data = await api.postJson(ApiEndpoints.driverApplicationSubmit, body);
      if ((data['accessToken'] ?? data['token']) != null) {
        await TokenManager.saveAccessToken('${data['accessToken'] ?? data['token'] ?? ''}');
      }
      if (data['refreshToken'] != null) {
        final currentAccess = await TokenManager.getAccessToken();
        await TokenManager.saveTokens(
          accessToken: currentAccess ?? '${data['accessToken'] ?? data['token'] ?? ''}',
          refreshToken: '${data['refreshToken']}',
        );
      }
      if (data['user'] is Map) {
        final user = WeretUser.fromJson(data['user'] as Map<String, dynamic>);
        await _cacheUser(user);
        state = state.copyWith(user: user, loading: false, clearError: true);
      } else {
        state = state.copyWith(loading: false, clearError: true);
      }
    } catch (e) {
      state = state.copyWith(loading: false, error: localizedApiError(e, fallbackKey: 'error'));
      rethrow;
    }
  }

  Future<void> verifyPassword(String password) async {
    final api = await _api;
    await api.postJson(ApiEndpoints.authVerifyPassword, {'password': password});
  }

  Future<Map<String, dynamic>> requestPhoneOtp(String phone, {bool forRegister = false}) async {
    state = state.copyWith(clearError: true);
    try {
      final api = await _api;
      return await api.postJson(ApiEndpoints.authPhoneOtp, {
        'phone': phone,
        if (forRegister) 'forRegister': true,
      });
    } catch (e) {
      state = state.copyWith(error: localizedApiError(e, fallbackKey: 'error'));
      rethrow;
    }
  }

  Future<void> verifyPhoneOtp(String phone, String otp, {String? name}) async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      final api = await _api;
      final data = await api.postJson(ApiEndpoints.authPhoneVerify, {
        'phone': phone,
        'otp': otp,
        if (name != null && name.isNotEmpty) 'name': name,
      });
      final token = '${data['accessToken'] ?? data['token'] ?? ''}';
      final refreshToken = '${data['refreshToken'] ?? ''}';
      final user = WeretUser.fromJson(data['user'] as Map<String, dynamic>);
      await applySession(token: token, refreshToken: refreshToken, user: user);
    } catch (e) {
      state = state.copyWith(loading: false, error: localizedApiError(e, fallbackKey: 'error'));
      rethrow;
    }
  }

  Future<Map<String, dynamic>> requestPasswordResetOtp(String email) async {
    state = state.copyWith(clearError: true);
    try {
      final api = await _api;
      return await api.postJson(ApiEndpoints.authForgotPassword, {'email': email.trim()});
    } catch (e) {
      state = state.copyWith(error: localizedApiError(e, fallbackKey: 'error'));
      rethrow;
    }
  }

  Future<void> resetPasswordWithOtp(String email, String otp, String password) async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      final api = await _api;
      await api.postJson(ApiEndpoints.authResetPassword, {
        'email': email.trim(),
        'otp': otp.trim(),
        'password': password,
      });
      state = state.copyWith(loading: false, clearError: true);
    } catch (e) {
      state = state.copyWith(loading: false, error: localizedApiError(e, fallbackKey: 'error'));
      rethrow;
    }
  }

  Future<Map<String, dynamic>> requestEmailOtp(String email) async {
    state = state.copyWith(clearError: true);
    try {
      final api = await _api;
      return await api.postJson(ApiEndpoints.authEmailSendOtp, {'email': email.trim()});
    } catch (e) {
      state = state.copyWith(error: localizedApiError(e, fallbackKey: 'error'));
      rethrow;
    }
  }

  Future<void> verifyEmailOtp(String email, String code) async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      final api = await _api;
      final data = await api.postJson(ApiEndpoints.authEmailVerifyOtp, {
        'email': email.trim(),
        'code': code.trim(),
      });
      final token = '${data['data']['accessToken']}';
      final refreshToken = '${data['data']['refreshToken'] ?? ''}';
      if (data['data']['user'] != null) {
        final user = WeretUser.fromJson(data['data']['user'] as Map<String, dynamic>);
        await applySession(token: token, refreshToken: refreshToken, user: user);
      }
    } catch (e) {
      state = state.copyWith(loading: false, error: localizedApiError(e, fallbackKey: 'error'));
      rethrow;
    }
  }

  Future<void> verifyFirebasePhone(String firebaseIdToken, {String? name}) async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      final api = await _api;
      final data = await api.postJson(ApiEndpoints.authVerifyFirebasePhone, {
        'firebaseIdToken': firebaseIdToken,
        if (name != null && name.isNotEmpty) 'name': name,
      });
      final token = '${data['data']['accessToken']}';
      final refreshToken = '${data['data']['refreshToken'] ?? ''}';
      final user = WeretUser.fromJson(data['data']['user'] as Map<String, dynamic>);
      await applySession(token: token, refreshToken: refreshToken, user: user);
    } catch (e) {
      state = state.copyWith(loading: false, error: localizedApiError(e, fallbackKey: 'error'));
      rethrow;
    }
  }

  Future<void> signInWithGoogle(String idToken, {String? accessToken}) async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      final api = await _api;
      final data = await api.postJson(ApiEndpoints.authGoogle, {'idToken': idToken});
      final token = '${data['accessToken'] ?? data['token'] ?? ''}';
      final refreshToken = '${data['refreshToken'] ?? ''}';
      final user = WeretUser.fromJson(data['user'] as Map<String, dynamic>);
      await applySession(token: token, refreshToken: refreshToken, user: user);
    } catch (e) {
      state = state.copyWith(loading: false, error: localizedApiError(e, fallbackKey: 'error'));
      rethrow;
    }
  }

  Future<void> switchRole(String role) async {
    final api = await _api;
    final data = await api.postJson(ApiEndpoints.switchRole, {'role': role});
    if ((data['accessToken'] ?? data['token']) != null) {
      final accessToken = '${data['accessToken'] ?? data['token'] ?? ''}';
      await TokenManager.saveAccessToken(accessToken);
      state = state.copyWith(token: accessToken);
    }
    if (data['refreshToken'] != null) {
      await TokenManager.saveTokens(
        accessToken: state.token ?? '',
        refreshToken: '${data['refreshToken']}',
      );
    }
    final user = WeretUser.fromJson(data['user'] as Map<String, dynamic>);
    await _cacheUser(user);
    state = state.copyWith(user: user, token: (data['accessToken'] ?? data['token']) != null ? '${data['accessToken'] ?? data['token'] ?? ''}' : state.token);
  }

  Future<void> updateProfile(Map<String, dynamic> patch) async {
    final api = await _api;
    final data = await api.patchJson(ApiEndpoints.authProfile, patch);
    final user = WeretUser.fromJson(data['user'] as Map<String, dynamic>);
    await _cacheUser(user);
    state = state.copyWith(user: user);
  }

  Future<void> deleteAccount({String? password}) async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      final api = await _api;
      final body = <String, dynamic>{};
      if (password != null && password.isNotEmpty) body['password'] = password;
      await api.postJson(ApiEndpoints.authDeleteAccount, body);
      if (_googleSignInInstance != null) {
        try {
          await _googleSignInInstance!.signOut();
        } catch (_) {}
      }
      await clearLocalSession();
    } catch (e) {
      state = state.copyWith(loading: false, error: localizedApiError(e, fallbackKey: 'error'));
      rethrow;
    }
  }

  Future<void> logout() async {
    final hasToken = await TokenManager.hasAccessToken();
    if (hasToken) {
      try {
        final api = await _api;
        await api.postJson(ApiEndpoints.authLogout);
      } catch (_) {}
    }
    if (_googleSignInInstance != null) {
      try {
        await _googleSignInInstance!.signOut();
      } catch (_) {}
    }
    await clearLocalSession();
  }

  void clearError() => state = state.copyWith(clearError: true);
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref);
});

final authHydrateProvider = FutureProvider<void>((ref) async {
  await ref.read(authProvider.notifier).hydrate();
});
