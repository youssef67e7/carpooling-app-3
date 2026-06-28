import 'package:flutter/material.dart';
import '../../core/theme/weret_tokens.dart';

class WeretTextField extends StatelessWidget {
  final TextEditingController controller;
  final FocusNode? focusNode;
  final String? label;
  final String? hint;
  final TextInputType? keyboardType;
  final bool obscure;
  final String? Function(String?)? validator;
  final TextInputAction? textInputAction;
  final void Function(String)? onFieldSubmitted;
  final VoidCallback? onTap;
  final IconData? prefixIcon;
  final String? prefixText;
  final bool readOnly;

  static final _border = OutlineInputBorder(
    borderRadius: BorderRadius.circular(WeretTokens.fieldRadius),
    borderSide: BorderSide(color: WeretTokens.borderSubtle),
  );

  static final _focusedBorder = OutlineInputBorder(
    borderRadius: BorderRadius.circular(WeretTokens.fieldRadius),
    borderSide: const BorderSide(color: WeretTokens.brand, width: 1.5),
  );

  static final _errorBorder = OutlineInputBorder(
    borderRadius: BorderRadius.circular(WeretTokens.fieldRadius),
    borderSide: BorderSide(color: WeretTokens.error.withValues(alpha: 0.5)),
  );

  const WeretTextField({
    super.key,
    required this.controller,
    this.focusNode,
    this.label,
    this.hint,
    this.keyboardType,
    this.obscure = false,
    this.validator,
    this.textInputAction,
    this.onFieldSubmitted,
    this.onTap,
    this.prefixIcon,
    this.prefixText,
    this.readOnly = false,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (label != null) ...[
          Text(
            label!,
            style: const TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 14,
              color: WeretTokens.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
        ],
        SizedBox(
          height: 50,
          child: TextFormField(
            controller: controller,
            focusNode: focusNode,
            keyboardType: keyboardType,
            obscureText: obscure,
            validator: validator,
            textInputAction: textInputAction,
            onFieldSubmitted: onFieldSubmitted,
            onTap: onTap,
            readOnly: readOnly,
            style: const TextStyle(
              fontSize: 14,
              color: WeretTokens.textPrimary,
            ),
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: const TextStyle(
                color: WeretTokens.textMuted,
                fontSize: 14,
              ),
              filled: true,
              fillColor: WeretTokens.inputFill,
              prefixIcon: prefixIcon != null
                  ? Icon(prefixIcon, size: 20, color: WeretTokens.textMuted)
                  : null,
              prefixText: prefixText,
              border: _border,
              enabledBorder: _border,
              focusedBorder: _focusedBorder,
              errorBorder: _errorBorder,
              focusedErrorBorder: _errorBorder.copyWith(
                borderSide: BorderSide(
                  color: WeretTokens.error.withValues(alpha: 0.5),
                  width: 1.5,
                ),
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 14,
              ),
              errorStyle: const TextStyle(height: 0, fontSize: 0),
            ),
          ),
        ),
      ],
    );
  }
}
