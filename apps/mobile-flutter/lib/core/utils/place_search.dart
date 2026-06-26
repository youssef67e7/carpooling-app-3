import 'dart:convert';
import 'package:http/http.dart' as http;

class PlaceSearch {
  const PlaceSearch._();

  static Future<List<Map<String, dynamic>>> searchPlaces(
    String query, {
    double? lat,
    double? lng,
    int limit = 5,
  }) async {
    if (query.trim().isEmpty) return [];
    final params = {
      'q': query,
      'format': 'json',
      'limit': limit.toString(),
      'addressdetails': '1',
    };
    if (lat != null && lng != null) {
      params['lat'] = lat.toStringAsFixed(6);
      params['lon'] = lng.toStringAsFixed(6);
    }
    final uri = Uri.https('nominatim.openstreetmap.org', 'search', params);
    try {
      final res = await http.get(uri, headers: {'User-Agent': 'WERET/1.0'});
      if (res.statusCode != 200) return [];
      final List body = jsonDecode(res.body);
      return body.map((p) {
        final addr = p['address'] as Map<String, dynamic>? ?? {};
        return {
          'placeId': p['place_id'],
          'label': p['display_name'],
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

  static Future<Map<String, dynamic>?> reverse(double lat, double lng) async {
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
