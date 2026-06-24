import 'package:latlong2/latlong.dart';

/// Decodes Google encoded polyline string into lat/lng points.
List<LatLng> decodeEncodedPolyline(String encoded) {
  final points = <LatLng>[];
  var index = 0;
  var lat = 0;
  var lng = 0;
  while (index < encoded.length) {
    var shift = 0;
    var result = 0;
    int b;
    do {
      b = encoded.codeUnitAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    final dlat = (result & 1) != 0 ? ~(result >> 1) : (result >> 1);
    lat += dlat;
    shift = 0;
    result = 0;
    do {
      b = encoded.codeUnitAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    final dlng = (result & 1) != 0 ? ~(result >> 1) : (result >> 1);
    lng += dlng;
    points.add(LatLng(lat / 1e5, lng / 1e5));
  }
  return points;
}

List<LatLng> latLngListFrom(dynamic raw) {
  if (raw is! List) return const [];
  final out = <LatLng>[];
  for (final p in raw) {
    if (p is Map) {
      final lat = p['lat'] ?? p['latitude'];
      final lng = p['lng'] ?? p['longitude'];
      if (lat is num && lng is num) out.add(LatLng(lat.toDouble(), lng.toDouble()));
    }
  }
  return out;
}
