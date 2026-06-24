import 'package:flutter/material.dart';
import '../../core/theme/weret_tokens.dart';

class WeretTextField extends StatelessWidget {
  const WeretTextField({
    super.key,
    required this.label,
    required this.controller,
    this.keyboardType,
    this.obscure = false,
    this.hint,
    this.helper,
  });

  final String label;
  final TextEditingController controller;
  final TextInputType? keyboardType;
  final bool obscure;
  final String? hint;
  final String? helper;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
          const SizedBox(height: 8),
          TextField(
            controller: controller,
            keyboardType: keyboardType,
            obscureText: obscure,
            decoration: InputDecoration(hintText: hint),
          ),
          if (helper != null) ...[
            const SizedBox(height: 6),
            Text(helper!, style: const TextStyle(fontSize: 12, color: WeretTokens.textSecondary, height: 1.4)),
          ],
        ],
      ),
    );
  }
}
