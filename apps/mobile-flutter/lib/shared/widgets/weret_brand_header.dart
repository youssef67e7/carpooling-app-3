import 'package:flutter/material.dart';
import '../../core/theme/weret_tokens.dart';
import 'language_bar.dart';
import 'weret_logo.dart';

/// Brand block: animated logo (strokes + WERET) + optional subtitle & language.
class WeretBrandHeader extends StatelessWidget {
  const WeretBrandHeader({
    super.key,
    this.subtitle,
    this.showLanguage = true,
    this.compact = false,
    this.onDark = false,
  });

  final String? subtitle;
  final bool showLanguage;
  final bool compact;
  final bool onDark;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        compact
            ? WeretLogo.standard(onDark: onDark)
            : const WeretLogo.hero(),
        if (subtitle != null) ...[
          const SizedBox(height: 10),
          Text(
            subtitle!,
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: compact ? 14 : 16, color: onDark ? Colors.white70 : WeretTokens.textSecondary),
          ),
        ],
        if (showLanguage) ...[
          SizedBox(height: compact ? 12 : 16),
          const LanguageBar(),
        ],
      ],
    );
  }
}
