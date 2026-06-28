import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import '../../core/theme/weret_tokens.dart';

class SuccessModal extends StatelessWidget {
  const SuccessModal({
    super.key,
    required this.title,
    required this.description,
    required this.amount,
    required this.onDone,
    this.onPayAgain,
    this.currency = 'EGP',
  });

  final String title;
  final String description;
  final String amount;
  final VoidCallback onDone;
  final VoidCallback? onPayAgain;
  final String currency;

  static Future<void> show(
    BuildContext context, {
    required String title,
    required String description,
    required String amount,
    required VoidCallback onDone,
    VoidCallback? onPayAgain,
  }) {
    return showDialog(
      context: context,
      barrierColor: WeretTokens.textPrimary.withValues(alpha: 0.6),
      builder: (_) => SuccessModal(
        title: title,
        description: description,
        amount: amount,
        onDone: onDone,
        onPayAgain: onPayAgain,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: WeretTokens.surface,
      elevation: 0,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(WeretTokens.cardRadius),
      ),
      child: Container(
        width: double.infinity,
        constraints: const BoxConstraints(maxWidth: 380),
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: const BoxDecoration(
                color: WeretTokens.brand,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.check,
                color: WeretTokens.surface,
                size: 32,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              title,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 22,
                color: WeretTokens.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              description,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 14,
                color: WeretTokens.textSecondary,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'totalPayment'.tr(),
              style: const TextStyle(
                fontSize: 12,
                color: WeretTokens.textMuted,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              '$currency $amount',
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 28,
                color: WeretTokens.textPrimary,
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 55,
              child: FilledButton(
                onPressed: onDone,
                style: FilledButton.styleFrom(
                  backgroundColor: WeretTokens.brand,
                  foregroundColor: WeretTokens.surface,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  textStyle: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 16,
                  ),
                ),
                child: Text('done'.tr()),
              ),
            ),
            if (onPayAgain != null) ...[
              const SizedBox(height: 12),
              TextButton(
                onPressed: onPayAgain,
                child: Text(
                  'payAgain'.tr(),
                  style: const TextStyle(
                    color: WeretTokens.textPrimary,
                    fontSize: 14,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
