import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';

/// A styled polyline segment for [WeretRideMap].
class WeretMapPolyline {
  const WeretMapPolyline({
    required this.points,
    required this.color,
    this.strokeWidth = 4,
    this.dashed = false,
  });

  final List<LatLng> points;
  final Color color;
  final double strokeWidth;
  final bool dashed;
}

/// Map overlay data built from ride state + locations.
class WeretMapScene {
  const WeretMapScene({
    this.polylines = const [],
    this.fitPoints = const [],
    this.driver,
    this.driverBearing,
    this.pickup,
    this.destination,
    this.nearbyDrivers = const [],
    this.etaMinutes,
    this.legendKey,
  });

  final List<WeretMapPolyline> polylines;
  final List<LatLng> fitPoints;
  final LatLng? driver;
  final double? driverBearing;
  final LatLng? pickup;
  final LatLng? destination;
  final List<LatLng> nearbyDrivers;
  final int? etaMinutes;
  final String? legendKey;
}

/// A heatmap zone returned from the backend driver heatmap API.
class HeatmapZone {
  const HeatmapZone({required this.center, required this.count});

  final LatLng center;
  final int count;
}
