import 'package:flutter/material.dart';
import '../../core/theme/weret_tokens.dart';

class MoreMenuRow extends StatelessWidget {
  const MoreMenuRow({super.key, required this.icon, required this.title, this.subtitle, required this.onTap});
  final IconData icon;
  final String title;
  final String? subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: WeretTokens.inputFill.withValues(alpha: 0.45),
        borderRadius: BorderRadius.circular(WeretTokens.cardRadius),
        border: Border.all(color: WeretTokens.border.withValues(alpha: 0.75)),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
        leading: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: WeretTokens.brand,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: Colors.white, size: 22),
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
        subtitle: subtitle != null ? Text(subtitle!, style: const TextStyle(color: WeretTokens.textSecondary, height: 1.3)) : null,
        trailing: Container(
          width: 28,
          height: 28,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: WeretTokens.border),
            color: WeretTokens.surface,
          ),
          child: const Icon(Icons.chevron_left, size: 18, color: WeretTokens.textSecondary),
        ),
        onTap: onTap,
      ),
    );
  }
}
