import 'dart:math' as math;

import 'package:latlong2/latlong.dart';

class DriverCluster {
  final LatLng centroid;
  final List<LatLng> points;
  int get count => points.length;

  DriverCluster({required this.centroid, required this.points});

  factory DriverCluster.from(List<LatLng> points) {
    final sumLat = points.fold<double>(0, (s, p) => s + p.latitude);
    final sumLng = points.fold<double>(0, (s, p) => s + p.longitude);
    return DriverCluster(
      centroid: LatLng(sumLat / points.length, sumLng / points.length),
      points: points,
    );
  }
}

/// Groups nearby driver markers into clusters based on zoom level.
///
/// At zoom >= [maxClusterZoom] markers are returned individually.
/// Below that, markers within the same grid cell (cellSizeDeg) are clustered.
List<DriverCluster> clusterDrivers(List<LatLng> drivers, double zoom, {double maxClusterZoom = 15}) {
  if (drivers.length < 2 || zoom >= maxClusterZoom) {
    return drivers.map((p) => DriverCluster(centroid: p, points: [p])).toList();
  }

  final cellSize = 360.0 / math.pow(2, zoom - 1);
  final grid = <String, List<LatLng>>{};

  for (final p in drivers) {
    final cx = (p.longitude / cellSize).floor();
    final cy = (p.latitude / cellSize).floor();
    final key = '$cx,$cy';
    grid.putIfAbsent(key, () => []).add(p);
  }

  return grid.values.map((pts) => DriverCluster.from(pts)).toList();
}
