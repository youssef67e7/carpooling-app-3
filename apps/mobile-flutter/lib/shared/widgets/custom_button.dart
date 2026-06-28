import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/theme/weret_tokens.dart';

enum ButtonVariant { primary, secondary, outlined, text }

class CustomButton extends StatelessWidget {
  final String title;
  final VoidCallback? onPressed;
  final bool loading;
  final bool disabled;
  final ButtonVariant variant;
  final IconData? icon;
  final double height;

  const CustomButton({
    super.key,
    required this.title,
    this.onPressed,
    this.loading = false,
    this.disabled = false,
    this.variant = ButtonVariant.primary,
    this.icon,
    this.height = 52,
  });

  bool get _inactive => disabled || loading || onPressed == null;

  Color get _loaderColor => switch (variant) {
        ButtonVariant.primary => WeretTokens.surface,
        ButtonVariant.secondary => WeretTokens.brand,
        ButtonVariant.outlined => WeretTokens.brand,
        ButtonVariant.text => WeretTokens.textSecondary,
      };

  Widget _buildChild() {
    if (loading) {
      return SizedBox(
        width: 22,
        height: 22,
        child: CircularProgressIndicator(
          strokeWidth: 2.5,
          color: _loaderColor,
        ),
      );
    }
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (icon != null) ...[Icon(icon, size: 20), const SizedBox(width: 10)],
        Flexible(child: Text(title, textAlign: TextAlign.center)),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: height,
      child: AnimatedOpacity(
        duration: const Duration(milliseconds: 150),
        opacity: _inactive ? 0.5 : 1.0,
        child: switch (variant) {
          ButtonVariant.primary => _buildFilled(),
          ButtonVariant.secondary => _buildSecondary(),
          ButtonVariant.outlined => _buildOutlined(),
          ButtonVariant.text => _buildText(),
        },
      ),
    );
  }

  Widget _buildFilled() {
    return FilledButton(
      onPressed: _inactive ? null : onPressed,
      style: FilledButton.styleFrom(
        backgroundColor: WeretTokens.brand,
        foregroundColor: WeretTokens.surface,
        disabledBackgroundColor: WeretTokens.brand,
        disabledForegroundColor: WeretTokens.surface,
        elevation: _inactive ? 0 : 4,
        shadowColor: WeretTokens.brand.withValues(alpha: 0.2),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(WeretTokens.pillRadius),
        ),
        textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
      ),
      child: _buildChild(),
    );
  }

  Widget _buildSecondary() {
    return FilledButton(
      onPressed: _inactive ? null : onPressed,
      style: FilledButton.styleFrom(
        backgroundColor: WeretTokens.brandSurface,
        foregroundColor: WeretTokens.brand,
        disabledBackgroundColor: WeretTokens.brandSurface,
        disabledForegroundColor: WeretTokens.textMuted,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(WeretTokens.pillRadius),
        ),
        textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
      ),
      child: _buildChild(),
    );
  }

  Widget _buildOutlined() {
    return OutlinedButton(
      onPressed: _inactive ? null : onPressed,
      style: OutlinedButton.styleFrom(
        foregroundColor: WeretTokens.brand,
        backgroundColor: WeretTokens.surface,
        side: BorderSide(
          color: _inactive ? WeretTokens.border : WeretTokens.brand,
          width: 2,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(WeretTokens.pillRadius),
        ),
        textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
      ),
      child: _buildChild(),
    );
  }

  Widget _buildText() {
    return TextButton(
      onPressed: _inactive ? null : onPressed,
      style: TextButton.styleFrom(
        foregroundColor:
            _inactive ? WeretTokens.textMuted : WeretTokens.textSecondary,
        textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
      ),
      child: Text(title),
    );
  }
}

class WeretLinkButton extends StatelessWidget {
  final String title;
  final VoidCallback? onPressed;
  final bool enabled;

  const WeretLinkButton({
    super.key,
    required this.title,
    this.onPressed,
    this.enabled = true,
  });

  @override
  Widget build(BuildContext context) {
    final active = enabled && onPressed != null;
    return TextButton(
      onPressed: active ? onPressed : null,
      style: TextButton.styleFrom(
        minimumSize: const Size.fromHeight(36),
        padding: const EdgeInsets.symmetric(horizontal: 4),
        foregroundColor:
            active ? WeretTokens.textSecondary : WeretTokens.textMuted,
        textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
      ),
      child: Text(title),
    );
  }
}

class WeretGoogleButton extends StatelessWidget {
  final VoidCallback? onPressed;

  const WeretGoogleButton({super.key, this.onPressed});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 50,
      child: OutlinedButton.icon(
        onPressed: onPressed,
        icon: Image.asset(
          'assets/images/design/03_google_modal_avatar_a.png',
          width: 20,
          height: 20,
        ),
        label: Text(
          'weretContinueGoogle'.tr(),
          style: const TextStyle(
            color: WeretTokens.textPrimary,
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
        style: OutlinedButton.styleFrom(
          side: const BorderSide(color: WeretTokens.borderSubtle),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
    );
  }
}
