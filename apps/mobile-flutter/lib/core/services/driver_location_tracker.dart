import 'dart:async';

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

  Future<void> _startStream() async {
    try {
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) perm = await Geolocator.requestPermission();
      if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) return;

      const settings = LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 12,
      );

      _sub = Geolocator.getPositionStream(locationSettings: settings).listen((pos) async {
        _ref.read(driverGpsProvider.notifier).state = LatLng(pos.latitude, pos.longitude);
        await _ref.read(rideProvider.notifier).updateDriverLocation(pos.latitude, pos.longitude);
      });

      final pos = await Geolocator.getCurrentPosition();
      _ref.read(driverGpsProvider.notifier).state = LatLng(pos.latitude, pos.longitude);
      await _ref.read(rideProvider.notifier).updateDriverLocation(pos.latitude, pos.longitude);
    } catch (_) {}
  }
}

final driverLocationTrackerProvider = Provider<DriverLocationTracker>((ref) {
  final tracker = DriverLocationTracker(ref);
  ref.onDispose(tracker.stop);
  return tracker;
});
