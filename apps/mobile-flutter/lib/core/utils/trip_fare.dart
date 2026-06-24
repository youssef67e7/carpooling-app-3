import 'dart:math' as math;

double haversineKm(double lat1, double lng1, double lat2, double lng2) {
  const r = 6371.0;
  final dLat = _rad(lat2 - lat1);
  final dLng = _rad(lng2 - lng1);
  final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
      math.cos(_rad(lat1)) * math.cos(_rad(lat2)) * math.sin(dLng / 2) * math.sin(dLng / 2);
  return r * 2 * math.asin(math.sqrt(a));
}

double _rad(double d) => d * math.pi / 180.0;

double fareFromVehicle(Map<String, dynamic> v, double km) {
  final base = (v['baseFare'] as num?)?.toDouble() ?? 10;
  final perKm = (v['pricePerKm'] as num?)?.toDouble() ?? 2;
  return base + perKm * km;
}
