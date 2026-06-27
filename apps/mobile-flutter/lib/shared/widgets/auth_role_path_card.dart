import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import '../../core/theme/auth_flow.dart';
import '../../core/theme/weret_tokens.dart';
import 'custom_button.dart';

/// One registration path (passenger or driver) with email option.
class AuthRolePathCard extends StatelessWidget {
  const AuthRolePathCard({
    super.key,
    required this.flow,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onEmailRegister,
  });

  final AuthFlow flow;
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onEmailRegister;

  @override
  Widget build(BuildContext context) {
    final accent = flow.accent;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: WeretTokens.surface,
        borderRadius: BorderRadius.circular(WeretTokens.cardRadius),
        border: Border.all(color: WeretTokens.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: flow.accentSurface,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: accent, size: 24),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17)),
                    const SizedBox(height: 4),
                    Text(subtitle, style: const TextStyle(color: WeretTokens.textSecondary, fontSize: 13, height: 1.35)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          CustomButton(title: flow == AuthFlow.driver ? 'registerDriverCreate'.tr() : 'registerPassengerCreate'.tr(), onPressed: onEmailRegister),
        ],
      ),
    );
  }
}
