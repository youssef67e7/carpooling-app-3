import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:go_router/go_router.dart';
import '../api/api_client.dart';
import '../api/api_endpoints.dart';
import '../router/app_router.dart';

/// Stored notification data from background tap — used when app opens
/// from a terminated state via getInitialMessage.
Map<String, String?> pendingNotificationPayload = {};

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  final data = message.data;
  debugPrint('[FCM] Background message: ${data['type']} rideId=${data['rideId']}');
  pendingNotificationPayload = data.map((k, v) => MapEntry(k, v?.toString()));
}

class FcmService {
  static bool _initialized = false;
  static OverlayEntry? _currentBanner;
  static String? _pendingRideId;

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
      pendingNotificationPayload = initialMessage.data.map((k, v) => MapEntry(k, v?.toString()));
      final rideId = initialMessage.data['rideId'];
      if (rideId != null && rideId.isNotEmpty) {
        _pendingRideId = rideId;
      }
    }

    _initialized = true;
  }

  static void processPendingNavigation() {
    final rideId = _pendingRideId;
    if (rideId == null) return;
    _pendingRideId = null;
    _navigateToRide(rideId);
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

  static StreamSubscription<String> listenTokenRefresh(void Function(String token) onRefresh) {
    return FirebaseMessaging.instance.onTokenRefresh.listen(onRefresh);
  }

  static void _handleForegroundMessage(RemoteMessage message) {
    final data = message.data;
    final type = data['type'];
    final rideId = data['rideId'];
    debugPrint('[FCM] Foreground message: type=$type rideId=$rideId');

    final title = message.notification?.title ?? data['title'] ?? '';
    final body = message.notification?.body ?? data['body'] ?? '';
    if (title.isEmpty && body.isEmpty) return;

    _showInAppBanner(title, body, rideId);
  }

  static void _showInAppBanner(String title, String body, String? rideId) {
    final ctx = rootNavigatorKey.currentContext;
    if (ctx == null) {
      debugPrint('[FCM] No navigator context for in-app banner');
      return;
    }

    _currentBanner?.remove();
    _currentBanner = OverlayEntry(
      builder: (context) => Positioned(
        top: MediaQuery.of(context).padding.top + 8,
        left: 12,
        right: 12,
        child: Material(
          elevation: 6,
          borderRadius: BorderRadius.circular(12),
          child: InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: () {
              _currentBanner?.remove();
              _currentBanner = null;
              if (rideId != null && rideId.isNotEmpty) {
                _navigateToRide(rideId);
              }
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  const Icon(Icons.notifications_active, color: Color(0xFF6C63FF), size: 20),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                        if (body.isNotEmpty)
                          Text(body, style: const TextStyle(fontSize: 12, color: Colors.black54), maxLines: 1, overflow: TextOverflow.ellipsis),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, size: 18),
                    onPressed: () {
                      _currentBanner?.remove();
                      _currentBanner = null;
                    },
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    color: Colors.black38,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );

    Overlay.of(ctx).insert(_currentBanner!);

    Future.delayed(const Duration(seconds: 5), () {
      _currentBanner?.remove();
      _currentBanner = null;
    });
  }

  static void _handleNotificationTap(RemoteMessage message) {
    final data = message.data;
    final type = data['type'];
    final rideId = data['rideId'];
    debugPrint('[FCM] Tap: type=$type rideId=$rideId');

    if (rideId != null && rideId.isNotEmpty) {
      _navigateToRide(rideId);
    }
  }

  static void _navigateToRide(String rideId, {int retries = 5}) {
    final ctx = rootNavigatorKey.currentContext;
    if (ctx == null) {
      if (retries > 0) {
        Future.delayed(const Duration(milliseconds: 500), () {
          _navigateToRide(rideId, retries: retries - 1);
        });
      }
      return;
    }
    try {
      GoRouter.of(ctx).push('/ride-chat/$rideId');
    } catch (e) {
      debugPrint('[FCM] Navigation error: $e');
    }
  }
}
