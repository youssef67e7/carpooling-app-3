import 'package:flutter/material.dart';

import '../../core/theme/weret_tokens.dart';

/// Auth field — matches web admin login labels + inputs.
class AuthFormField extends StatelessWidget {
  const AuthFormField({
    super.key,
    required this.label,
    required this.controller,
    this.keyboardType,
    this.obscure = false,
    this.hint,
    this.helper,
    this.validator,
    this.maxLength,
    this.textInputAction,
    this.onFieldSubmitted,
  });

  final String label;
  final TextEditingController controller;
  final TextInputType? keyboardType;
  final bool obscure;
  final String? hint;
  final String? helper;
  final String? Function(String?)? validator;
  final int? maxLength;
  final TextInputAction? textInputAction;
  final void Function(String)? onFieldSubmitted;

  @override
  Widget build(BuildContext context) {
    final isRtl = Directionality.of(context) == TextDirection.rtl;
    final labelText = isRtl ? label : label.toUpperCase();

    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            labelText,
            style: TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 12,
              letterSpacing: isRtl ? 0 : 0.96,
              color: WeretTokens.textSecondary,
            ),
          ),
          const SizedBox(height: 6),
          TextFormField(
            controller: controller,
            keyboardType: keyboardType,
            obscureText: obscure,
            validator: validator,
            maxLength: maxLength,
            textInputAction: textInputAction,
            onFieldSubmitted: onFieldSubmitted,
            style: const TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 16,
              color: WeretTokens.textPrimary,
            ),
            decoration: InputDecoration(
              hintText: hint,
              counterText: maxLength != null ? '' : null,
            ),
          ),
          if (helper != null) ...[
            const SizedBox(height: 6),
            Text(helper!, style: const TextStyle(fontSize: 13, color: WeretTokens.textSecondary, height: 1.4)),
          ],
        ],
      ),
    );
  }
}
