import 'package:flutter/material.dart';

class WeretServiceTypeGallery {
  const WeretServiceTypeGallery._();

  static List<Map<String, dynamic>> get allTypes => [
        {
          'key': 'economy',
          'label': 'Economy',
          'description': 'Affordable everyday rides',
          'icon': Icons.directions_car,
          'color': Colors.green,
          'multiplier': 1.0,
        },
        {
          'key': 'comfort',
          'label': 'Comfort',
          'description': 'Extra legroom and quiet rides',
          'icon': Icons.airport_shuttle,
          'color': Colors.blue,
          'multiplier': 1.4,
        },
        {
          'key': 'premium',
          'label': 'Premium',
          'description': 'Luxury vehicles with top service',
          'icon': Icons.diamond,
          'color': Colors.amber,
          'multiplier': 2.0,
        },
        {
          'key': 'xl',
          'label': 'XL',
          'description': 'Space for groups up to 6',
          'icon': Icons.time_to_leave,
          'color': Colors.deepPurple,
          'multiplier': 1.6,
        },
        {
          'key': 'motorcycle',
          'label': 'Motorcycle',
          'description': 'Fast and agile through traffic',
          'icon': Icons.motorcycle,
          'color': Colors.orange,
          'multiplier': 0.7,
        },
        {
          'key': 'delivery',
          'label': 'Delivery',
          'description': 'Send packages and goods',
          'icon': Icons.delivery_dining,
          'color': Colors.indigo,
          'multiplier': 1.2,
        },
        {
          'key': 'shipping',
          'label': 'Shipping',
          'description': 'Large item transport',
          'icon': Icons.inventory_2,
          'color': Colors.teal,
          'multiplier': 1.8,
        },
      ];

  static Map<String, dynamic>? typeForKey(String key) {
    try {
      return allTypes.firstWhere((t) => t['key'] == key.toLowerCase());
    } catch (_) {
      return null;
    }
  }
}
