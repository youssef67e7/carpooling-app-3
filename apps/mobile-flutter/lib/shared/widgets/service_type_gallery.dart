import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import '../../core/theme/weret_tokens.dart';

class ServiceTypeGallery extends StatelessWidget {
  const ServiceTypeGallery({
    super.key,
    required this.selected,
    required this.onSelected,
    this.types = const ['shipping', 'delivery', 'travel'],
  });

  final String selected;
  final ValueChanged<String> onSelected;
  final List<String> types;

  static const _capacities = {
    'shipping': 1,
    'delivery': 4,
    'travel': 4,
    'motorcycle': 1,
    'car_standard': 4,
    'car_comfort': 4,
  };

  static const _icons = {
    'shipping': Icons.local_shipping_outlined,
    'delivery': Icons.directions_bus_outlined,
    'travel': Icons.flight_takeoff_outlined,
    'motorcycle': Icons.two_wheeler_outlined,
    'car_standard': Icons.directions_car_outlined,
    'car_comfort': Icons.directions_car_filled_outlined,
  };

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('passengerCarGalleryTitle'.tr(), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
        const SizedBox(height: 12),
        SizedBox(
          height: 132,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: types.length,
            separatorBuilder: (_, __) => const SizedBox(width: 10),
            itemBuilder: (context, i) {
              final type = types[i];
              final isSelected = type == selected;
              return GestureDetector(
                onTap: () => onSelected(type),
                child: Container(
                  width: 118,
                  decoration: BoxDecoration(
                    color: WeretTokens.surface,
                    borderRadius: BorderRadius.circular(WeretTokens.cardRadius),
                    border: Border.all(
                      color: isSelected ? WeretTokens.brand : WeretTokens.border.withValues(alpha: 0.7),
                      width: isSelected ? 2 : 1,
                    ),
                    boxShadow: [
                      BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, 3)),
                    ],
                  ),
                  child: Stack(
                    children: [
                      Positioned.fill(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(WeretTokens.cardRadius - 1),
                          child: Container(
                            color: WeretTokens.inputFill,
                            child: Icon(_icons[type] ?? Icons.directions_car, size: 42, color: WeretTokens.textSecondary),
                          ),
                        ),
                      ),
                      if (isSelected)
                        const Positioned(
                          top: 8,
                          right: 8,
                          child: CircleAvatar(
                            radius: 11,
                            backgroundColor: WeretTokens.brand,
                            child: Icon(Icons.check, size: 14, color: Colors.white),
                          ),
                        ),
                      Positioned(
                        left: 8,
                        right: 8,
                        bottom: 8,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Text(
                              'vehicleType_$type'.tr(),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12),
                            ),
                            Row(
                              children: [
                                const Icon(Icons.person_outline, size: 14),
                                Text('${_capacities[type] ?? 1}', style: const TextStyle(fontSize: 12)),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
