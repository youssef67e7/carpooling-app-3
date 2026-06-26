import 'package:flutter/material.dart';
import '../../core/theme/weret_tokens.dart';

enum PillVariant { success, error, warning, info, neutral }

class StatusPill extends StatelessWidget {
  final String label;
  final PillVariant variant;
  final double fontSize;

  const StatusPill({
    super.key,
    required this.label,
    this.variant = PillVariant.neutral,
    this.fontSize = 11,
  });

  @override
  Widget build(BuildContext context) {
    final (Color bg, Color fg) = switch (variant) {
      PillVariant.success => (WeretTokens.successSoft, WeretTokens.onSuccess),
      PillVariant.error => (WeretTokens.dangerSoft, WeretTokens.onError),
      PillVariant.warning => (WeretTokens.warningSoft, WeretTokens.onWarning),
      PillVariant.info => (WeretTokens.infoSoft, WeretTokens.onInfo),
      PillVariant.neutral => (WeretTokens.neutralSoft, WeretTokens.onNeutral),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(WeretTokens.pillRadius),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: fg,
          fontSize: fontSize,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
