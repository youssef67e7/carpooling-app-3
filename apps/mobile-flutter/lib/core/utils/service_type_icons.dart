import 'package:flutter/material.dart';

class ServiceTypeIcons {
  const ServiceTypeIcons._();

  static IconData iconFor(String type) {
    switch (type.toLowerCase()) {
      case 'economy':
        return Icons.directions_car;
      case 'comfort':
      case 'car_comfort':
        return Icons.airport_shuttle;
      case 'premium':
        return Icons.diamond;
      case 'xl':
        return Icons.time_to_leave;
      case 'motorcycle':
        return Icons.motorcycle;
      case 'shipping':
        return Icons.inventory_2;
      case 'delivery':
        return Icons.delivery_dining;
      case 'travel':
        return Icons.luggage;
      default:
        return Icons.directions_car;
    }
  }

  static String assetPathFor(String type) {
    switch (type.toLowerCase()) {
      case 'economy':
        return 'assets/images/car_economy.png';
      case 'comfort':
      case 'car_comfort':
        return 'assets/images/car_comfort.png';
      case 'premium':
        return 'assets/images/car_premium.png';
      case 'xl':
        return 'assets/images/car_xl.png';
      case 'motorcycle':
        return 'assets/images/motorcycle.png';
      case 'shipping':
        return 'assets/images/shipping.png';
      case 'delivery':
        return 'assets/images/delivery.png';
      default:
        return 'assets/images/car_economy.png';
    }
  }

  static Color colorFor(String type) {
    switch (type.toLowerCase()) {
      case 'economy':
        return Colors.green;
      case 'comfort':
      case 'car_comfort':
        return Colors.blue;
      case 'premium':
        return Colors.amber;
      case 'xl':
        return Colors.deepPurple;
      case 'motorcycle':
        return Colors.orange;
      case 'shipping':
        return Colors.teal;
      case 'delivery':
        return Colors.indigo;
      default:
        return Colors.grey;
    }
  }
}
