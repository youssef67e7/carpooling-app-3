import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';

import '../../core/theme/weret_tokens.dart';

/// Shows driver price offer — passenger accepts or rejects.
class DriverOfferBanner extends StatelessWidget {
  const DriverOfferBanner({
    super.key,
    required this.ride,
    required this.onAccept,
    required this.onReject,
    this.loading = false,
  });

  final Map<String, dynamic> ride;
  final VoidCallback onAccept;
  final VoidCallback onReject;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    final proposal = ride['driverProposal'];
    if (proposal is! Map) return const SizedBox.shrink();

    final meta = proposal['driverMeta'];
    final driverName = meta is Map ? '${meta['name'] ?? ''}'.trim() : '';
    final fare = '${proposal['proposedFare'] ?? proposal['fare'] ?? '—'}';
    final carSpec = meta is Map ? '${meta['carSpec'] ?? ''}'.trim() : '';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: WeretTokens.surface,
        borderRadius: BorderRadius.circular(WeretTokens.fieldRadius),
        border: Border.all(color: WeretTokens.border),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 20, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              const Icon(Icons.local_offer_outlined, color: WeretTokens.brand),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'passengerDriverOfferTitle'.tr(namedArgs: {'name': driverName.isEmpty ? 'driver'.tr() : driverName, 'amount': fare}),
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: WeretTokens.textPrimary),
                ),
              ),
              Text(fare, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 20, color: WeretTokens.brand)),
            ],
          ),
          if (carSpec.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(carSpec, style: const TextStyle(fontSize: 12, color: WeretTokens.textSecondary)),
            ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: loading ? null : onReject,
                  child: Text('reject'.tr()),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: FilledButton(
                  onPressed: loading ? null : onAccept,
                  child: loading
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : Text('accept'.tr()),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  static bool hasPendingOffer(Map<String, dynamic> ride) {
    if (ride['awaitingDriverConfirm'] == true) return false;
    if ('${ride['status']}' != 'pending') return false;
    final p = ride['driverProposal'];
    return p is Map && p['driverId'] != null;
  }
}
