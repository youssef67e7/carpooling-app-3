import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../core/theme/weret_tokens.dart';

class FormErrorCallout extends StatelessWidget {
  final String message;
  final VoidCallback? onDismiss;

  const FormErrorCallout({super.key, required this.message, this.onDismiss});

  @override
  Widget build(BuildContext context) {
    if (message.isEmpty) return const SizedBox.shrink();

    return AnimatedSize(
      duration: const Duration(milliseconds: 200),
      curve: Curves.easeOutCubic,
      alignment: Alignment.topCenter,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: WeretTokens.dangerSoft,
          borderRadius: BorderRadius.circular(WeretTokens.fieldRadius),
          border: Border.all(color: WeretTokens.error.withValues(alpha: 0.3)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(
              padding: EdgeInsets.only(top: 0.5),
              child: Icon(
                Icons.error_outline_rounded,
                color: WeretTokens.error,
                size: 20,
                semanticLabel: 'Error',
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(
                  color: WeretTokens.onError,
                  fontSize: 14,
                  height: 1.4,
                ),
              ),
            ),
            if (onDismiss != null)
              SizedBox(
                width: 32,
                height: 32,
                child: IconButton(
                  icon: const Icon(Icons.close, size: 16, color: WeretTokens.textMuted),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                  tooltip: 'Dismiss',
                  onPressed: () {
                    HapticFeedback.selectionClick();
                    onDismiss!.call();
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }
}
