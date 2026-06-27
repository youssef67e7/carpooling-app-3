import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/ride_provider.dart';

/// Streams passenger GPS to backend while active.
///
/// Uses [AndroidSettings] with [ForegroundNotificationConfig] to keep the
/// stream alive when the app backgrounds on Android.
class PassengerLocationTracker {
  PassengerLocationTracker(this._ref);

  final Ref _ref;
  StreamSubscription<Position>? _sub;

  void start() {
    stop();
    unawaited(_startStream());
  }

  void stop() {
    _sub?.cancel();
    _sub = null;
  }

  LocationSettings get _settings {
    if (defaultTargetPlatform == TargetPlatform.android) {
      return AndroidSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 50,
        foregroundNotificationConfig: const ForegroundNotificationConfig(
          notificationText: 'Sharing your location for ride tracking',
          notificationTitle: 'WERET',
          enableWakeLock: true,
        ),
      );
    }
    if (defaultTargetPlatform == TargetPlatform.iOS) {
      return AppleSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 50,
        allowBackgroundLocationUpdates: true,
        showBackgroundLocationIndicator: true,
      );
    }
    return const LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 50,
    );
  }

  Future<void> _startStream() async {
    try {
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) perm = await Geolocator.requestPermission();
      if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) return;

      _sub = Geolocator.getPositionStream(locationSettings: _settings).listen(
        (pos) async {
          await _ref.read(rideProvider.notifier).updatePassengerLocation(pos.latitude, pos.longitude);
        },
        onError: (e) => debugPrint('[PassengerLocationTracker] Stream error: $e'),
      );

      final pos = await Geolocator.getCurrentPosition();
      await _ref.read(rideProvider.notifier).updatePassengerLocation(pos.latitude, pos.longitude);
    } catch (e) {
      debugPrint('[PassengerLocationTracker] Error: $e');
    }
  }
}

final passengerLocationTrackerProvider = Provider<PassengerLocationTracker>((ref) {
  final tracker = PassengerLocationTracker(ref);
  ref.onDispose(tracker.stop);
  return tracker;
});
