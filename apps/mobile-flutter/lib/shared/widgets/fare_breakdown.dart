import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import '../../core/theme/weret_tokens.dart';

class FareBreakdown extends StatelessWidget {
  const FareBreakdown({
    super.key,
    required this.baseFare,
    required this.distanceKm,
    required this.pricePerKm,
    this.surgeMultiplier,
    this.totalFare,
  });

  final num baseFare;
  final num distanceKm;
  final num pricePerKm;
  final num? surgeMultiplier;
  final num? totalFare;

  @override
  Widget build(BuildContext context) {
    final distanceCharge = distanceKm * pricePerKm;
    final surge = surgeMultiplier ?? 1;
    final subtotal = (baseFare + distanceCharge) * surge;
    final displayTotal = totalFare ?? subtotal;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: WeretTokens.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: WeretTokens.border.withValues(alpha: 0.5)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('fareBreakdownTitle'.tr(), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
        const SizedBox(height: 12),
        _row('fareBaseFare'.tr(), baseFare),
        _row('fareDistance'.tr(args: [distanceKm.toStringAsFixed(1)]), distanceCharge),
        if (surge > 1) _row('fareSurge'.tr(args: ['${(surge * 100).toInt()}%']), (baseFare + distanceCharge) * (surge - 1)),
        const Divider(),
        _row('fareTotal'.tr(), displayTotal, bold: true),
      ]),
    );
  }

  Widget _row(String label, num amount, {bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: bold ? WeretTokens.textPrimary : WeretTokens.textSecondary, fontWeight: bold ? FontWeight.w600 : FontWeight.normal, fontSize: 14)),
          Text('\$${amount.toStringAsFixed(2)}', style: TextStyle(fontWeight: bold ? FontWeight.bold : FontWeight.w500, fontSize: 14)),
        ],
      ),
    );
  }
}
