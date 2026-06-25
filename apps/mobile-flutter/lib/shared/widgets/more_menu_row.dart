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
      child: Material(
        color: WeretTokens.inputFill.withValues(alpha: 0.45),
        borderRadius: BorderRadius.circular(WeretTokens.cardRadius),
        child: InkWell(
          borderRadius: BorderRadius.circular(WeretTokens.cardRadius),
          onTap: onTap,
          child: Container(
            decoration: BoxDecoration(
              border: Border.all(color: WeretTokens.border.withValues(alpha: 0.75)),
              borderRadius: BorderRadius.circular(WeretTokens.cardRadius),
            ),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: WeretTokens.brand,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(icon, color: Colors.white, size: 22),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
                        if (subtitle != null) ...[
                          const SizedBox(height: 2),
                          Text(subtitle!, style: const TextStyle(color: WeretTokens.textSecondary, height: 1.3)),
                        ],
                      ],
                    ),
                  ),
                  Container(
                    width: 28,
                    height: 28,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: WeretTokens.border),
                      color: WeretTokens.surface,
                    ),
                    child: const Icon(Icons.chevron_left, size: 18, color: WeretTokens.textSecondary),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
