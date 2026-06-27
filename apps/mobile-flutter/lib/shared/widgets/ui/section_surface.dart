import 'package:flutter/material.dart';
import '../../../core/theme/weret_tokens.dart';

class SectionSurface extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry? margin;
  final Color? color;
  final Clip clipBehavior;

  const SectionSurface({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.margin,
    this.color,
    this.clipBehavior = Clip.none,
  });

  BoxDecoration get _decoration => BoxDecoration(
    color: color ?? WeretTokens.surface,
    borderRadius: BorderRadius.circular(WeretTokens.cardRadius),
    border: Border.all(color: WeretTokens.border.withValues(alpha: 0.7)),
  );

  @override
  Widget build(BuildContext context) {
    final surface = Container(
      padding: padding,
      decoration: _decoration,
      clipBehavior: clipBehavior,
      child: child,
    );

    if (margin != null) return Padding(padding: margin!, child: surface);
    return surface;
  }
}
