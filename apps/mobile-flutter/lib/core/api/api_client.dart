import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _tokenKey = 'weret_token';

typedef UnauthorizedHandler = void Function();

UnauthorizedHandler? globalUnauthorizedHandler;

class ApiConfig {
  ApiConfig._();

  static const String baseUrl = 'https://carpooling-app-3-virid.vercel.app/api';
}

class ApiClient {
  ApiClient(this._prefs) {
    print('🌐 APP IS CONNECTING TO: ${ApiConfig.baseUrl}');
    _dio = Dio(
      BaseOptions(
        baseUrl: ApiConfig.baseUrl,
        connectTimeout: const Duration(seconds: 20),
        receiveTimeout: const Duration(seconds: 30),
        headers: {'Accept': 'application/json'},
      ),
    );
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          debugPrint('');
          debugPrint('════════ REQUEST ════════');
          debugPrint('${options.method} ${options.uri}');
          debugPrint('Headers: ${options.headers}');
          debugPrint('Data: ${options.data}');
          debugPrint('═════════════════════════');
          handler.next(options);
        },
        onResponse: (response, handler) {
          debugPrint('');
          debugPrint('════════ RESPONSE ════════');
          debugPrint('${response.statusCode}');
          debugPrint('${response.requestOptions.uri}');
          debugPrint('${response.data}');
          debugPrint('══════════════════════════');
          handler.next(response);
        },
        onError: (error, handler) {
          debugPrint('');
          debugPrint('════════ ERROR ════════');
          debugPrint('${error.requestOptions.method}');
          debugPrint('${error.requestOptions.uri}');
          debugPrint('Status: ${error.response?.statusCode}');
          debugPrint('Message: ${error.message}');
          debugPrint('Data: ${error.response?.data}');
          debugPrint('═══════════════════════');
          handler.next(error);
        },
      ),
    );
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = _prefs.getString(_tokenKey);
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (err, handler) async {
          if (err.response?.statusCode == 401 && globalUnauthorizedHandler != null) {
            globalUnauthorizedHandler!();
          }
          if (err.requestOptions.method == 'GET' && _shouldRetry(err)) {
            try {
              final res = await _dio.fetch(err.requestOptions);
              return handler.resolve(res);
            } catch (_) {}
          }
          handler.next(err);
        },
      ),
    );
  }

  late final Dio _dio;
  final SharedPreferences _prefs;

  Dio get dio => _dio;

  static bool _shouldRetry(DioException err) {
    return err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.receiveTimeout ||
        (err.response?.statusCode ?? 0) >= 500;
  }

  Future<void> setToken(String? token) async {
    if (token == null || token.isEmpty) {
      await _prefs.remove(_tokenKey);
    } else {
      await _prefs.setString(_tokenKey, token);
    }
  }

  String? get token => _prefs.getString(_tokenKey);

  Future<Map<String, dynamic>> getJson(String path, {Map<String, dynamic>? query}) async {
    final res = await _dio.get<Map<String, dynamic>>(path, queryParameters: query);
    return res.data ?? {};
  }

  Future<Map<String, dynamic>> postJson(String path, [Map<String, dynamic>? body]) async {
    final res = await _dio.post<Map<String, dynamic>>(path, data: body ?? {});
    return res.data ?? {};
  }

  Future<Map<String, dynamic>> postMultipart(String path, FormData formData) async {
    final res = await _dio.post<Map<String, dynamic>>(
      path,
      data: formData,
      options: Options(contentType: 'multipart/form-data'),
    );
    return res.data ?? {};
  }

  Future<Map<String, dynamic>> patchJson(String path, [Map<String, dynamic>? body]) async {
    final res = await _dio.patch<Map<String, dynamic>>(path, data: body ?? {});
    return res.data ?? {};
  }

  Future<void> delete(String path) async {
    await _dio.delete(path);
  }
}

final apiClientProvider = FutureProvider<ApiClient>((ref) async {
  final prefs = await SharedPreferences.getInstance();
  return ApiClient(prefs);
});
