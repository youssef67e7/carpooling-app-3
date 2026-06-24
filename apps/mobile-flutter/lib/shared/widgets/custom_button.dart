import 'package:flutter/material.dart';

import '../../core/theme/weret_tokens.dart';

class CustomButton extends StatelessWidget {
  const CustomButton({
    super.key,
    required this.title,
    required this.onPressed,
    this.loading = false,
    this.disabled = false,
    this.variant = 'filled',
    this.icon,
  });

  final String title;
  final VoidCallback? onPressed;
  final bool loading;
  final bool disabled;
  final String variant;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final inactive = disabled || loading || onPressed == null;
    final child = loading
        ? const SizedBox(height: 22, width: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
        : Row(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[Icon(icon, size: 20), const SizedBox(width: 10)],
              Flexible(child: Text(title, textAlign: TextAlign.center)),
            ],
          );

    if (variant == 'outline') {
      return OutlinedButton(
        onPressed: inactive ? null : onPressed,
        style: OutlinedButton.styleFrom(
          minimumSize: const Size.fromHeight(52),
          foregroundColor: WeretTokens.brand,
          backgroundColor: WeretTokens.surface,
          side: const BorderSide(color: WeretTokens.brand, width: 2),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(WeretTokens.pillRadius)),
        ),
        child: child,
      );
    }
    if (variant == 'text') {
      return TextButton(onPressed: inactive ? null : onPressed, child: Text(title));
    }
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(WeretTokens.pillRadius),
        boxShadow: inactive
            ? null
            : [BoxShadow(color: Colors.black.withValues(alpha: 0.2), blurRadius: 20, offset: const Offset(0, 4))],
      ),
      child: FilledButton(
        onPressed: inactive ? null : onPressed,
        style: FilledButton.styleFrom(
          minimumSize: const Size.fromHeight(52),
          backgroundColor: inactive ? WeretTokens.border : WeretTokens.brand,
          foregroundColor: Colors.white,
          disabledBackgroundColor: WeretTokens.border,
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(WeretTokens.pillRadius)),
          textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
        ),
        child: child,
      ),
    );
  }
}

class WeretLinkButton extends StatelessWidget {
  const WeretLinkButton({super.key, required this.title, required this.onPressed});
  final String title;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return TextButton(
      onPressed: onPressed,
      child: Text(title, style: const TextStyle(color: WeretTokens.textSecondary, fontWeight: FontWeight.w600)),
    );
  }
}
