import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import '../api/api_client.dart';
import '../api/api_endpoints.dart';

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  debugPrint('[FCM] Background message: ${message.data}');
}

class FcmService {
  static bool _initialized = false;

  static Future<void> initialize() async {
    if (_initialized) return;

    final messaging = FirebaseMessaging.instance;

    final settings = await messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );

    debugPrint('[FCM] Permission: ${settings.authorizationStatus}');

    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

    FirebaseMessaging.onMessageOpenedApp.listen(_handleNotificationTap);

    final initialMessage = await messaging.getInitialMessage();
    if (initialMessage != null) {
      _handleNotificationTap(initialMessage);
    }

    _initialized = true;
  }

  static Future<String?> getDeviceToken() async {
    try {
      final token = await FirebaseMessaging.instance.getToken();
      return token;
    } catch (e) {
      debugPrint('[FCM] getDeviceToken error: $e');
      return null;
    }
  }

  static Future<bool> registerToken(ApiClient api) async {
    try {
      final token = await getDeviceToken();
      if (token == null || token.isEmpty) return false;
      await api.postJson(ApiEndpoints.authRegisterToken, {
        'token': token,
        'platform': defaultTargetPlatform == TargetPlatform.iOS ? 'ios' : 'android',
      });
      debugPrint('[FCM] Token registered: $token');
      return true;
    } catch (e) {
      debugPrint('[FCM] registerToken error: $e');
      return false;
    }
  }

  static void listenTokenRefresh(void Function(String token) onRefresh) {
    FirebaseMessaging.instance.onTokenRefresh.listen(onRefresh);
  }

  static void _handleForegroundMessage(RemoteMessage message) {
    debugPrint('[FCM] Foreground message: ${message.data}');
  }

  static void _handleNotificationTap(RemoteMessage message) {
    final data = message.data;
    final type = data['type'];
    final rideId = data['rideId'];
    debugPrint('[FCM] Tap: type=$type rideId=$rideId');
  }
}
