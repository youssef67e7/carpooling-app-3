import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import '../../core/theme/weret_tokens.dart';

class LanguageBar extends StatelessWidget {
  const LanguageBar({super.key});

  @override
  Widget build(BuildContext context) {
    final isAr = context.locale.languageCode == 'ar';
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _LangChip(label: 'arabic'.tr(), active: isAr, onTap: () => context.setLocale(const Locale('ar'))),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8),
          child: Text('|', style: TextStyle(color: WeretTokens.textSecondary.withValues(alpha: 0.6))),
        ),
        _LangChip(label: 'english'.tr(), active: !isAr, onTap: () => context.setLocale(const Locale('en'))),
      ],
    );
  }
}

class _LangChip extends StatelessWidget {
  const _LangChip({required this.label, required this.active, required this.onTap});
  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Text(
        label,
        style: TextStyle(
          fontSize: 14,
          fontWeight: active ? FontWeight.w700 : FontWeight.w500,
          color: active ? WeretTokens.textPrimary : WeretTokens.textSecondary,
        ),
      ),
    );
  }
}
