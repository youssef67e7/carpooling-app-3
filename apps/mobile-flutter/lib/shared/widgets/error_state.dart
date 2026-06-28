import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import '../../core/theme/weret_tokens.dart';

class ErrorState extends StatelessWidget {
  final String message;
  final VoidCallback? onRetry;

  const ErrorState({
    super.key,
    required this.message,
    this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.error_outline_rounded,
              size: 64,
              color: WeretTokens.error.withValues(alpha: 0.7),
            ),
            const SizedBox(height: 16),
            Text(
              'errorTitle'.tr(),
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: WeretTokens.error,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              message,
              style: const TextStyle(
                fontSize: 14,
                color: WeretTokens.textSecondary,
                height: 1.4,
              ),
              textAlign: TextAlign.center,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
            if (onRetry != null) ...[
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: FilledButton.icon(
                  onPressed: onRetry,
                  icon: const Icon(Icons.refresh, size: 18),
                  label: Text('retry'.tr()),
                  style: FilledButton.styleFrom(
                    backgroundColor: WeretTokens.brand,
                    foregroundColor: WeretTokens.surface,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(WeretTokens.pillRadius),
                    ),
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
