import 'package:flutter/material.dart';
import '../../../core/theme/weret_tokens.dart';

class SectionSurface extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry? margin;
  final Color? color;
  final bool showBorder;
  final double? borderRadius;
  final Clip clipBehavior;
  final BoxShadow? shadow;
  final VoidCallback? onTap;
  final bool enabled;

  const SectionSurface({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.margin,
    this.color,
    this.showBorder = true,
    this.borderRadius,
    this.clipBehavior = Clip.none,
    this.shadow,
    this.onTap,
    this.enabled = true,
  });

  SectionSurface.list({
    super.key,
    EdgeInsetsGeometry? margin,
    Color? color,
    bool showBorder = true,
    double? borderRadius,
    Clip clipBehavior = Clip.none,
    BoxShadow? shadow,
    VoidCallback? onTap,
    bool enabled = true,
    this.padding = const EdgeInsets.all(16),
    List<Widget> children = const [],
  })  : margin = margin,
        color = color,
        showBorder = showBorder,
        borderRadius = borderRadius,
        clipBehavior = clipBehavior,
        shadow = shadow,
        onTap = onTap,
        enabled = enabled,
        child = Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: children,
        );

  double get _radius => borderRadius ?? WeretTokens.cardRadius;

  BoxDecoration get _decoration {
    final border = showBorder
        ? Border.all(color: WeretTokens.border.withValues(alpha: 0.7))
        : null;
    final shadows = shadow != null ? [shadow!] : null;
    return BoxDecoration(
      color: color ?? WeretTokens.surface,
      borderRadius: BorderRadius.circular(_radius),
      border: border,
      boxShadow: shadows,
    );
  }

  @override
  Widget build(BuildContext context) {
    final surface = Container(
      padding: padding,
      decoration: _decoration,
      clipBehavior: clipBehavior,
      child: child,
    );

    if (onTap == null) {
      if (margin != null) return Padding(padding: margin!, child: surface);
      return surface;
    }

    final interactive = Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: enabled ? onTap : null,
        borderRadius: BorderRadius.circular(_radius),
        canRequestFocus: enabled,
        child: surface,
      ),
    );

    if (margin != null) return Padding(padding: margin!, child: interactive);
    return interactive;
  }
}
