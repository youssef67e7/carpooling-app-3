import 'package:flutter/material.dart';
import '../../core/theme/weret_tokens.dart';

class EmptyState extends StatelessWidget {
  const EmptyState({super.key, required this.title, this.subtitle, this.icon = Icons.inbox_outlined});
  final String title;
  final String? subtitle;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 48, color: WeretTokens.textSecondary),
            const SizedBox(height: 12),
            Text(title, textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
            if (subtitle != null) ...[
              const SizedBox(height: 8),
              Text(subtitle!, textAlign: TextAlign.center, style: const TextStyle(color: WeretTokens.textSecondary)),
            ],
          ],
        ),
      ),
    );
  }
}
