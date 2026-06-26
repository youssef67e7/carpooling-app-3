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
      barrierColor: Colors.black.withValues(alpha: 0.6),
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
      backgroundColor: Colors.transparent,
      elevation: 0,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24),
      child: Container(
        width: double.infinity,
        constraints: const BoxConstraints(maxWidth: 380),
        padding: const EdgeInsets.all(32),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: const BoxDecoration(
                color: Colors.black,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.check, color: Colors.white, size: 32),
            ),
            const SizedBox(height: 20),
            Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 22, color: Colors.black)),
            const SizedBox(height: 8),
            Text(
              description,
              textAlign: TextAlign.center,
              style:   const TextStyle(fontSize: 14, color: WeretTokens.textSecondary),
            ),
            const SizedBox(height: 20),
            const Text('Total Payment', style: TextStyle(fontSize: 12, color: WeretTokens.textMuted)),
            const SizedBox(height: 4),
            Text('$currency $amount', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 28, color: Colors.black)),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 55,
              child: FilledButton(
                onPressed: onDone,
                style: FilledButton.styleFrom(
                  backgroundColor: WeretTokens.brand,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                ),
                child: const Text('Done'),
              ),
            ),
            if (onPayAgain != null) ...[
              const SizedBox(height: 12),
              TextButton(
                onPressed: onPayAgain,
                child: const Text('Pay Again', style: TextStyle(color: Colors.black, fontSize: 14)),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
