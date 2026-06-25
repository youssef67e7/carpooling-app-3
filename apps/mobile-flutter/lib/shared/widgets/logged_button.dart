import 'package:flutter/material.dart';
import '../../core/services/debug_logger.dart';

class LoggedButton extends StatelessWidget {
  const LoggedButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.child,
    this.style,
    this.icon,
    this.type = LoggedButtonType.elevated,
    this.minWidth,
    this.minHeight,
  });

  final String label;
  final VoidCallback? onPressed;
  final Widget? child;
  final ButtonStyle? style;
  final Widget? icon;
  final LoggedButtonType type;
  final double? minWidth;
  final double? minHeight;

  @override
  Widget build(BuildContext context) {
    final logger = DebugLogger.instance;
    void handler() {
      logger.action(label);
      onPressed?.call();
    }

    switch (type) {
      case LoggedButtonType.elevated:
        return SizedBox(
          width: minWidth,
          height: minHeight,
          child: ElevatedButton(
            onPressed: onPressed != null ? handler : null,
            style: style,
            child: child ?? Text(label),
          ),
        );
      case LoggedButtonType.outlined:
        return SizedBox(
          width: minWidth,
          height: minHeight,
          child: OutlinedButton(
            onPressed: onPressed != null ? handler : null,
            style: style,
            child: child ?? Text(label),
          ),
        );
      case LoggedButtonType.text:
        return SizedBox(
          width: minWidth,
          height: minHeight,
          child: TextButton(
            onPressed: onPressed != null ? handler : null,
            style: style,
            child: child ?? Text(label),
          ),
        );
      case LoggedButtonType.icon:
        return IconButton(
          onPressed: onPressed != null ? handler : null,
          icon: icon ?? const Icon(Icons.touch_app),
          tooltip: label,
        );
      case LoggedButtonType.filled:
        return SizedBox(
          width: minWidth,
          height: minHeight,
          child: FilledButton(
            onPressed: onPressed != null ? handler : null,
            style: style,
            child: child ?? Text(label),
          ),
        );
      case LoggedButtonType.filledTonal:
        return SizedBox(
          width: minWidth,
          height: minHeight,
          child: FilledButton.tonal(
            onPressed: onPressed != null ? handler : null,
            style: style,
            child: child ?? Text(label),
          ),
        );
    }
  }
}

enum LoggedButtonType { elevated, outlined, text, icon, filled, filledTonal }

extension InkWellLogging on InkWell {
  static Widget wrap({
    required String label,
    required Widget child,
    EdgeInsetsGeometry? padding,
    BorderRadius? borderRadius,
    VoidCallback? onTap,
  }) {
    return GestureDetector(
      onTap: () {
        DebugLogger.instance.action(label);
        onTap?.call();
      },
      child: child,
    );
  }
}

class LoggedIconButton extends StatelessWidget {
  const LoggedIconButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon = Icons.touch_app,
    this.tooltip,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData icon;
  final String? tooltip;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      onPressed: onPressed != null
          ? () {
              DebugLogger.instance.action(label);
              onPressed?.call();
            }
          : null,
      icon: Icon(icon),
      tooltip: tooltip ?? label,
    );
  }
}

class LoggedListTile extends StatelessWidget {
  const LoggedListTile({
    super.key,
    required this.label,
    required this.onTap,
    this.title,
    this.subtitle,
    this.leading,
    this.trailing,
    this.contentPadding,
  });

  final String label;
  final VoidCallback? onTap;
  final Widget? title;
  final Widget? subtitle;
  final Widget? leading;
  final Widget? trailing;
  final EdgeInsetsGeometry? contentPadding;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      title: title,
      subtitle: subtitle,
      leading: leading,
      trailing: trailing,
      contentPadding: contentPadding,
      onTap: onTap != null
          ? () {
              DebugLogger.instance.action(label);
              onTap?.call();
            }
          : null,
    );
  }
}
