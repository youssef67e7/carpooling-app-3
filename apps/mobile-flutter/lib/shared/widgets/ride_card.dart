import 'package:flutter/material.dart';
import '../../core/theme/weret_tokens.dart';

class RideCard extends StatelessWidget {
  const RideCard({super.key, required this.ride});
  final Map<String, dynamic> ride;

  @override
  Widget build(BuildContext context) {
    final status = ride['status'] ?? '';
    final fare = ride['estimatedFare'] ?? ride['fare'] ?? '—';
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: WeretTokens.surface,
        borderRadius: BorderRadius.circular(WeretTokens.cardRadius),
        border: Border.all(color: WeretTokens.border.withValues(alpha: 0.7)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(status.toString().toUpperCase(), textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          Text('$fare', textAlign: TextAlign.center, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }
}
