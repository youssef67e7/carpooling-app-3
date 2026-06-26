import 'dart:convert';
import 'package:http/http.dart' as http;

class AutocompletePlaces {
  const AutocompletePlaces._();

  static Future<List<Map<String, dynamic>>> autocomplete(
    String query, {
    double? lat,
    double? lng,
  }) async {
    if (query.trim().isEmpty) return [];
    final params = {
      'q': query,
      'format': 'json',
      'limit': '5',
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
      final List data = jsonDecode(res.body);
      return data.map((p) => _toPlace(p)).toList();
    } catch (_) {
      return [];
    }
  }

  static Map<String, dynamic> _toPlace(Map<String, dynamic> raw) {
    final addr = raw['address'] as Map<String, dynamic>? ?? {};
    return {
      'placeId': raw['place_id'],
      'label': raw['display_name'],
      'lat': double.parse('${raw['lat']}'),
      'lng': double.parse('${raw['lon']}'),
      'street': addr['road'] ?? '',
      'city': addr['city'] ?? addr['town'] ?? addr['village'] ?? '',
      'country': addr['country'] ?? '',
    };
  }
}
