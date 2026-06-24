import 'package:flutter/material.dart';
import '../../core/theme/weret_tokens.dart';

class WeretStatCard extends StatelessWidget {
  const WeretStatCard({super.key, required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      decoration: BoxDecoration(
        color: WeretTokens.surface,
        borderRadius: BorderRadius.circular(WeretTokens.cardRadius),
        border: Border.all(color: WeretTokens.border.withValues(alpha: 0.7)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(label, textAlign: TextAlign.center, style: const TextStyle(fontSize: 14, color: WeretTokens.textSecondary)),
          const SizedBox(height: 8),
          Text(value, textAlign: TextAlign.center, style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }
}
