import 'dart:convert';
import 'package:http/http.dart' as http;

class OSMGeocodingService {
  const OSMGeocodingService._();

  static Future<List<Map<String, dynamic>>> search(
    String query, {
    double? proximityLat,
    double? proximityLng,
  }) async {
    if (query.trim().isEmpty) return [];
    final params = {
      'q': query,
      'format': 'json',
      'limit': '5',
      'addressdetails': '1',
    };
    if (proximityLat != null && proximityLng != null) {
      params['lat'] = proximityLat.toStringAsFixed(6);
      params['lon'] = proximityLng.toStringAsFixed(6);
    }
    final uri = Uri.https('nominatim.openstreetmap.org', 'search', params);
    try {
      final res = await http.get(uri, headers: {'User-Agent': 'WERET/1.0'});
      if (res.statusCode != 200) return [];
      final List data = jsonDecode(res.body);
      return data.map((p) {
        final addr = p['address'] as Map<String, dynamic>? ?? {};
        return {
          'id': p['place_id'],
          'name': p['display_name'],
          'lat': double.parse('${p['lat']}'),
          'lng': double.parse('${p['lon']}'),
          'street': addr['road'] ?? '',
          'city': addr['city'] ?? addr['town'] ?? addr['village'] ?? '',
          'country': addr['country'] ?? '',
        };
      }).toList();
    } catch (_) {
      return [];
    }
  }

  static Future<Map<String, dynamic>?> reverseGeocode(
    double lat,
    double lng,
  ) async {
    final uri = Uri.https(
      'nominatim.openstreetmap.org',
      'reverse',
      {'lat': lat.toStringAsFixed(6), 'lon': lng.toStringAsFixed(6), 'format': 'json'},
    );
    try {
      final res = await http.get(uri, headers: {'User-Agent': 'WERET/1.0'});
      if (res.statusCode != 200) return null;
      return jsonDecode(res.body) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }
}
