import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';
import '../providers/ride_provider.dart';

final driverGpsProvider = StateProvider<LatLng?>((ref) => null);

/// Streams driver GPS to backend while online.
class DriverLocationTracker {
  DriverLocationTracker(this._ref);

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
        distanceFilter: 12,
        foregroundNotificationConfig: const ForegroundNotificationConfig(
          notificationText: 'Driver location tracking active',
          notificationTitle: 'WERET',
          enableWakeLock: true,
        ),
      );
    }
    if (defaultTargetPlatform == TargetPlatform.iOS) {
      return AppleSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 12,
        allowBackgroundLocationUpdates: true,
        showBackgroundLocationIndicator: true,
      );
    }
    return const LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 12,
    );
  }

  Future<void> _startStream() async {
    try {
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) perm = await Geolocator.requestPermission();
      if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) return;

      _sub = Geolocator.getPositionStream(locationSettings: _settings).listen(
        (pos) async {
          _ref.read(driverGpsProvider.notifier).state = LatLng(pos.latitude, pos.longitude);
          await _ref.read(rideProvider.notifier).updateDriverLocation(pos.latitude, pos.longitude);
        },
        onError: (e) => debugPrint('[LocationTracker] Stream error: $e'),
      );

      final pos = await Geolocator.getCurrentPosition();
      _ref.read(driverGpsProvider.notifier).state = LatLng(pos.latitude, pos.longitude);
      await _ref.read(rideProvider.notifier).updateDriverLocation(pos.latitude, pos.longitude);
    } catch (e) {
      debugPrint('[LocationTracker] Error: $e');
    }
  }
}

final driverLocationTrackerProvider = Provider<DriverLocationTracker>((ref) {
  final tracker = DriverLocationTracker(ref);
  ref.onDispose(tracker.stop);
  return tracker;
});
