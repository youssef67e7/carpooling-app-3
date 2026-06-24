import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import 'geo_helpers.dart';
import 'map_polyline_model.dart';
import 'route_polyline.dart';
import 'trip_fare.dart';

/// Fits the map camera to show all [points] with padding.
void fitMapToPoints(MapController? controller, List<LatLng> points, {EdgeInsets padding = const EdgeInsets.all(40)}) {
  if (controller == null || points.length < 2) {
    if (controller != null && points.length == 1) {
      controller.move(points.first, 15);
    }
    return;
  }
  final bounds = LatLngBounds.fromPoints(points);
  controller.fitCamera(
    CameraFit.bounds(bounds: bounds, padding: padding),
  );
}

double bearingBetween(LatLng from, LatLng to) {
  final lat1 = from.latitude * math.pi / 180;
  final lat2 = to.latitude * math.pi / 180;
  final dLng = (to.longitude - from.longitude) * math.pi / 180;
  final y = math.sin(dLng) * math.cos(lat2);
  final x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dLng);
  return (math.atan2(y, x) * 180 / math.pi + 360) % 360;
}

int etaMinutesBetween(LatLng? from, LatLng? to, {double avgSpeedKmh = 30}) {
  if (from == null || to == null) return 0;
  final km = haversineKm(from.latitude, from.longitude, to.latitude, to.longitude);
  if (km < 0.05) return 1;
  return math.max(1, (km / (avgSpeedKmh / 60)).ceil());
}

List<LatLng> routePathFromRide(Map<String, dynamic>? ride) {
  if (ride == null) return const [];
  return latLngListFrom(ride['routePath']);
}

List<LatLng> routePathFromPreview(Map<String, dynamic>? preview) {
  if (preview == null) return const [];
  return latLngListFrom(preview['routePath']);
}

List<LatLng> collectNonNullPoints(Iterable<LatLng?> points) =>
    points.whereType<LatLng>().toList();

/// Builds polylines + metadata for passenger map.
WeretMapScene buildPassengerMapScene({
  Map<String, dynamic>? activeRide,
  LatLng? pickup,
  LatLng? destination,
  LatLng? driver,
  List<LatLng> nearbyDrivers = const [],
  List<LatLng> previewRoute = const [],
}) {
  const orange = Color(0xFFEA580C);
  const tripBlue = Color(0xFF2563EB);
  final polylines = <WeretMapPolyline>[];
  final fit = collectNonNullPoints([pickup, destination, driver, ...nearbyDrivers]);
  String? legendKey;
  int? eta;

  final storedRoute = routePathFromRide(activeRide);
  final tripRoute = storedRoute.isNotEmpty
      ? storedRoute
      : (previewRoute.isNotEmpty ? previewRoute : simpleRoute(pickup, destination, steps: 28));

  final status = activeRide != null ? '${activeRide['status']}' : '';

  if (activeRide != null && driver != null) {
    if (status == 'accepted') {
      polylines.add(WeretMapPolyline(
        points: simpleRoute(driver, pickup, steps: 20),
        color: orange,
        strokeWidth: 5,
      ));
      if (tripRoute.length >= 2) {
        polylines.add(WeretMapPolyline(points: tripRoute, color: tripBlue.withValues(alpha: 0.55), strokeWidth: 3, dashed: true));
      }
      legendKey = 'mapLegendToPickupPassenger';
      eta = etaMinutesBetween(driver, pickup);
    } else if (status == 'ongoing') {
      if (tripRoute.length >= 2) {
        polylines.add(WeretMapPolyline(points: tripRoute, color: tripBlue, strokeWidth: 5));
      } else {
        polylines.add(WeretMapPolyline(points: simpleRoute(driver, destination, steps: 20), color: tripBlue, strokeWidth: 5));
      }
      legendKey = 'mapLegendTripPassenger';
      eta = etaMinutesBetween(driver, destination);
    } else if (tripRoute.length >= 2) {
      polylines.add(WeretMapPolyline(points: tripRoute, color: tripBlue.withValues(alpha: 0.7), strokeWidth: 4, dashed: true));
    }
  } else if (tripRoute.length >= 2) {
    polylines.add(WeretMapPolyline(points: tripRoute, color: tripBlue.withValues(alpha: 0.85), strokeWidth: 4, dashed: true));
    fit.addAll(tripRoute);
  }

  double? bearing;
  if (driver != null && pickup != null && status == 'accepted') {
    bearing = bearingBetween(driver, pickup);
  } else if (driver != null && destination != null && status == 'ongoing') {
    bearing = bearingBetween(driver, destination);
  }

  return WeretMapScene(
    polylines: polylines,
    fitPoints: fit.isNotEmpty ? fit : tripRoute,
    driver: driver,
    driverBearing: bearing,
    pickup: pickup,
    destination: destination,
    nearbyDrivers: activeRide == null ? nearbyDrivers : const [],
    etaMinutes: eta,
    legendKey: legendKey,
  );
}

/// Builds polylines for driver map (first active ride focus, all rides contribute fit points).
WeretMapScene buildDriverMapScene({
  required List<Map<String, dynamic>> activeRides,
  LatLng? driverPos,
}) {
  const orange = Color(0xFFEA580C);
  const tripBlue = Color(0xFF2563EB);
  final polylines = <WeretMapPolyline>[];
  final fit = <LatLng>[];
  if (driverPos != null) fit.add(driverPos);

  Map<String, dynamic>? focus;
  for (final r in activeRides) {
    final pu = pickupFromRide(r);
    final de = destinationFromRide(r);
    if (pu != null) fit.add(pu);
    if (de != null) fit.add(de);
    focus ??= r;
  }

  if (focus != null && driverPos != null) {
    final pu = pickupFromRide(focus);
    final de = destinationFromRide(focus);
    final status = '${focus['status']}';
    final stored = routePathFromRide(focus);

    if (status == 'accepted' && pu != null) {
      polylines.add(WeretMapPolyline(points: simpleRoute(driverPos, pu, steps: 20), color: orange, strokeWidth: 5));
      final preview = stored.isNotEmpty ? stored : simpleRoute(pu, de, steps: 28);
      if (preview.length >= 2) {
        polylines.add(WeretMapPolyline(points: preview, color: tripBlue.withValues(alpha: 0.55), strokeWidth: 3, dashed: true));
      }
    } else if (status == 'ongoing') {
      final route = stored.isNotEmpty ? stored : simpleRoute(pu, de, steps: 28);
      if (route.length >= 2) {
        polylines.add(WeretMapPolyline(points: route, color: tripBlue, strokeWidth: 5));
      }
    }
  }

  double? bearing;
  if (focus != null && driverPos != null) {
    final pu = pickupFromRide(focus);
    final de = destinationFromRide(focus);
    final status = '${focus['status']}';
    if (status == 'accepted' && pu != null) bearing = bearingBetween(driverPos, pu);
    if (status == 'ongoing' && de != null) bearing = bearingBetween(driverPos, de);
  }

  final legendKey = focus != null && '${focus['status']}' == 'ongoing'
      ? 'mapLegendTripDriver'
      : (focus != null ? 'mapLegendToPickupDriver' : null);

  final eta = focus != null && driverPos != null
      ? ('${focus['status']}' == 'ongoing'
          ? etaMinutesBetween(driverPos, destinationFromRide(focus))
          : etaMinutesBetween(driverPos, pickupFromRide(focus)))
      : null;

  return WeretMapScene(
    polylines: polylines,
    fitPoints: fit,
    driver: driverPos,
    driverBearing: bearing,
    pickup: focus != null ? pickupFromRide(focus) : null,
    destination: focus != null ? destinationFromRide(focus) : null,
    etaMinutes: eta,
    legendKey: legendKey,
  );
}
