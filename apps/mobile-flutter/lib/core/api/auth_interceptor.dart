import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import '../router/app_router.dart' show rootNavigatorKey;
import '../services/token_manager.dart';

class _PendingRequest {
  _PendingRequest(this.options, this.handler);
  final RequestOptions options;
  final ErrorInterceptorHandler handler;
}

class AuthInterceptor extends Interceptor {
  AuthInterceptor(this._dio) {
    _refreshDio = Dio(
      BaseOptions(
        baseUrl: ApiConfig.baseUrl,
        connectTimeout: const Duration(seconds: 20),
        sendTimeout: const Duration(seconds: 20),
        receiveTimeout: const Duration(seconds: 30),
        headers: {'Accept': 'application/json'},
      ),
    );
  }

  final Dio _dio;
  late final Dio _refreshDio;
  bool _isRefreshing = false;
  bool _isLoggingOut = false;
  final _pendingRequests = <_PendingRequest>[];

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final token = await TokenManager.getAccessToken();
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    final statusCode = err.response?.statusCode;
    final data = err.response?.data is Map ? err.response?.data as Map : <dynamic, dynamic>{};
    final code = data['code'] as String?;
    final errorMsg = data['message'] as String?;

    if (statusCode == 403 && (code == 'ACCOUNT_BLOCKED' || code == 'ACCOUNT_SUSPENDED')) {
      await _forceLogout();
      if (rootNavigatorKey.currentContext != null) {
        ScaffoldMessenger.of(rootNavigatorKey.currentContext!).showSnackBar(
          SnackBar(
            content: Text(errorMsg ?? (code == 'ACCOUNT_BLOCKED' ? 'Account blocked' : 'Account suspended')),
            backgroundColor: Colors.red.shade700,
          ),
        );
      }
      handler.next(err);
      return;
    }

    if (statusCode != 401) {
      handler.next(err);
      return;
    }

    if (code == 'TOKEN_INVALID' || code == 'TOKEN_REVOKED') {
      await _forceLogout();
      handler.next(err);
      return;
    }

    if (_isRefreshing) {
      _pendingRequests.add(_PendingRequest(err.requestOptions, handler));
      return;
    }

    _isRefreshing = true;

    try {
      final refreshToken = await TokenManager.getRefreshToken();
      if (refreshToken == null || refreshToken.isEmpty) {
        await _forceLogout();
        _isRefreshing = false;
        handler.next(err);
        return;
      }

      final response = await _refreshDio.post(
        '/auth/refresh',
        data: {'refreshToken': refreshToken},
      );

      final responseData = response.data is Map ? response.data as Map : <dynamic, dynamic>{};
      final data = responseData['data'] is Map ? responseData['data'] as Map : <dynamic, dynamic>{};
      final newAccessToken = data['accessToken'] as String?;
      final newRefreshToken = data['refreshToken'] as String?;

      if (newAccessToken == null || newRefreshToken == null) {
        await _forceLogout();
        _isRefreshing = false;
        handler.next(err);
        return;
      }

      await TokenManager.saveTokens(
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      );

      for (final pending in _pendingRequests) {
        pending.options.headers['Authorization'] = 'Bearer $newAccessToken';
        try {
          final retryResponse = await _dio.fetch(pending.options);
          pending.handler.resolve(retryResponse);
        } catch (e) {
          pending.handler.reject(e is DioException ? e : DioException(requestOptions: pending.options, error: e));
        }
      }
      _pendingRequests.clear();

      err.requestOptions.headers['Authorization'] = 'Bearer $newAccessToken';
      try {
        final retryResponse = await _dio.fetch(err.requestOptions);
        handler.resolve(retryResponse);
      } catch (e) {
        handler.reject(e is DioException ? e : DioException(requestOptions: err.requestOptions, error: e));
      }
    } catch (_) {
      for (final pending in _pendingRequests) {
        pending.handler.next(err);
      }
      _pendingRequests.clear();
      await _forceLogout();
      handler.next(err);
    } finally {
      _isRefreshing = false;
    }
  }

  Future<void> _forceLogout() async {
    if (_isLoggingOut) return;
    _isLoggingOut = true;
    try {
      await TokenManager.clearAll();
      TokenManager.onForceLogout?.call();
    } catch (_) {
    } finally {
      _isLoggingOut = false;
    }
  }
}

class ApiConfig {
  ApiConfig._();

  static const String baseUrl = 'https://carpooling-app-3-virid.vercel.app/api';
}
