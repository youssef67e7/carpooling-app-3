import 'package:latlong2/latlong.dart';

LatLng? latLngFrom(dynamic value) {
  if (value == null) return null;
  if (value is LatLng) return value;
  if (value is Map) {
    final lat = value['lat'] ?? value['latitude'];
    final lng = value['lng'] ?? value['longitude'];
    if (lat is num && lng is num) return LatLng(lat.toDouble(), lng.toDouble());
  }
  return null;
}

LatLng? driverLatLngFromRide(Map<String, dynamic> ride) {
  final live = ride['driverLiveLocation'];
  final fromLive = latLngFrom(live);
  if (fromLive != null) return fromLive;
  final driver = ride['driverId'] ?? ride['driver'];
  if (driver is Map) return latLngFrom(driver['location']);
  return null;
}

LatLng? pickupFromRide(Map<String, dynamic> ride) => latLngFrom(ride['pickupLocation']);

LatLng? destinationFromRide(Map<String, dynamic> ride) => latLngFrom(ride['destinationLocation']);

List<LatLng> nearbyDriverPoints(List<dynamic> drivers) {
  final out = <LatLng>[];
  for (final d in drivers) {
    if (d is! Map) continue;
    final p = latLngFrom(d['location']);
    if (p != null) out.add(p);
  }
  return out;
}

List<LatLng> simpleRoute(LatLng? from, LatLng? to, {int steps = 16}) {
  if (from == null || to == null) return const [];
  if (from.latitude == to.latitude && from.longitude == to.longitude) return [from];
  final pts = <LatLng>[];
  for (var i = 0; i <= steps; i++) {
    final t = i / steps;
    pts.add(LatLng(
      from.latitude + (to.latitude - from.latitude) * t,
      from.longitude + (to.longitude - from.longitude) * t,
    ));
  }
  return pts;
}
