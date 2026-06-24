import 'package:flutter/material.dart';

import '../../../core/theme/weret_tokens.dart';

/// Rotated taxi marker with optional pulse ring for live driver position.
class DriverMapMarker extends StatelessWidget {
  const DriverMapMarker({
    super.key,
    this.bearing,
    this.size = 36,
    this.color = WeretTokens.brand,
    this.pulse = true,
  });

  final double? bearing;
  final double size;
  final Color color;
  final bool pulse;

  @override
  Widget build(BuildContext context) {
    final icon = Transform.rotate(
      angle: (bearing ?? 0) * 3.1415926535 / 180,
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white, width: 2.5),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.28), blurRadius: 8, offset: const Offset(0, 2))],
        ),
        child: Icon(Icons.local_taxi, color: Colors.white, size: size * 0.5),
      ),
    );

    if (!pulse) return icon;

    return Stack(
      alignment: Alignment.center,
      children: [
        Container(
          width: size + 14,
          height: size + 14,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: color.withValues(alpha: 0.18),
          ),
        ),
        icon,
      ],
    );
  }
}

/// Marker for nearby available drivers.
class NearbyDriverMarker extends StatelessWidget {
  const NearbyDriverMarker({super.key, this.size = 28});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: WeretTokens.brand.withValues(alpha: 0.92),
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white, width: 2),
      ),
      child: Icon(Icons.local_taxi, color: Colors.white, size: size * 0.5),
    );
  }
}
