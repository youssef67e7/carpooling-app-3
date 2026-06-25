import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'auth_interceptor.dart';

class ApiClient {
  ApiClient() {
    _dio = Dio(
      BaseOptions(
        baseUrl: ApiConfig.baseUrl,
        connectTimeout: const Duration(seconds: 20),
        receiveTimeout: const Duration(seconds: 30),
        headers: {'Accept': 'application/json'},
      ),
    );
    _dio.interceptors.insert(0, AuthInterceptor(_dio));
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
  }

  late final Dio _dio;

  Dio get dio => _dio;

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
  return ApiClient();
});
