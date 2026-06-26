import 'package:flutter/foundation.dart';

class MapProvider {
  const MapProvider._();

  static String get tileUrlTemplate {
    if (kIsWeb) {
      return 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    }
    return 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  }

  static Map<String, String> get tileHeaders => const {
        'User-Agent': 'WERET/1.0',
      };

  static double get maxZoom => 19.0;
  static double get minZoom => 3.0;
}
