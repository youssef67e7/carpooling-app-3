import 'dart:math';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

class MapCoords {
  const MapCoords._();

  static LatLngBounds boundsFromPoints(List<LatLng> points) {
    if (points.isEmpty) return LatLngBounds(const LatLng(0, 0), const LatLng(0, 0));
    double minLat = points.first.latitude;
    double maxLat = points.first.latitude;
    double minLng = points.first.longitude;
    double maxLng = points.first.longitude;
    for (final p in points) {
      if (p.latitude < minLat) minLat = p.latitude;
      if (p.latitude > maxLat) maxLat = p.latitude;
      if (p.longitude < minLng) minLng = p.longitude;
      if (p.longitude > maxLng) maxLng = p.longitude;
    }
    return LatLngBounds(LatLng(minLat, minLng), LatLng(maxLat, maxLng));
  }

  static LatLng centerOf(List<LatLng> points) {
    if (points.isEmpty) return const LatLng(0, 0);
    final b = boundsFromPoints(points);
    return LatLng(
      (b.southWest.latitude + b.northEast.latitude) / 2,
      (b.southWest.longitude + b.northEast.longitude) / 2,
    );
  }

  static double distanceKm(LatLng a, LatLng b) {
    const r = 6371.0;
    final dLat = _toRad(b.latitude - a.latitude);
    final dLng = _toRad(b.longitude - a.longitude);
    final sa = sin(dLat / 2);
    final sb = sin(dLng / 2);
    final x = sa * sa + cos(_toRad(a.latitude)) * cos(_toRad(b.latitude)) * sb * sb;
    return 2 * r * asin(sqrt(x));
  }

  static double _toRad(double deg) => deg * pi / 180;
}
