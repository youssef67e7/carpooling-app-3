import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// A widget that scales down on press and springs back on release.
///
/// Designed as a lightweight, reusable alternative to [InkWell] when you
/// want only a scale effect without ink splashes or ripples.
///
/// ```dart
/// PressableScale(
///   onTap: () => context.push('/detail'),
///   child: Card(child: ...),
/// )
/// ```
class PressableScale extends StatefulWidget {
  /// The widget to apply the scale effect to.
  final Widget child;

  /// Called when the user taps and releases.
  final VoidCallback? onTap;

  /// Called when the user long-presses.
  final VoidCallback? onLongPress;

  /// The scale factor to animate to on press. Defaults to `0.95`.
  ///
  /// Must be in the range `(0, 1)`.
  final double scale;

  /// Duration of the scale animation. Defaults to 100 ms.
  final Duration duration;

  /// Duration of the reverse (release) animation. Defaults to [duration].
  ///
  /// A slightly longer reverse can feel more natural.
  final Duration? reverseDuration;

  /// Whether the widget responds to input. Defaults to `true`.
  ///
  /// When `false`, taps are ignored and the widget is not scaled.
  final bool enabled;

  /// Whether to produce a light haptic on press. Defaults to `false`.
  final bool haptic;

  /// Hit test behavior for the underlying [GestureDetector].
  ///
  /// Defaults to [HitTestBehavior.opaque] so the entire child area
  /// is tappable even if the child doesn't fill its bounds.
  final HitTestBehavior behavior;

  const PressableScale({
    super.key,
    required this.child,
    this.onTap,
    this.onLongPress,
    this.scale = 0.95,
    this.duration = const Duration(milliseconds: 100),
    this.reverseDuration,
    this.enabled = true,
    this.haptic = false,
    this.behavior = HitTestBehavior.opaque,
  }) : assert(scale > 0 && scale < 1, 'scale must be in (0, 1)');

  @override
  State<PressableScale> createState() => _PressableScaleState();
}

class _PressableScaleState extends State<PressableScale>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late Animation<double> _scaleAnim;

  bool _isPressed = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: widget.duration,
      reverseDuration: widget.reverseDuration,
      vsync: this,
    );
    _scaleAnim = Tween<double>(begin: 1.0, end: widget.scale).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic),
    );
  }

  @override
  void didUpdateWidget(covariant PressableScale oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.scale != widget.scale ||
        oldWidget.duration != widget.duration ||
        oldWidget.reverseDuration != widget.reverseDuration) {
      _controller.duration = widget.duration;
      _controller.reverseDuration = widget.reverseDuration;
      _scaleAnim = Tween<double>(begin: 1.0, end: widget.scale).animate(
        CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic),
      );
    }
    if (!widget.enabled && _isPressed) {
      _isPressed = false;
      _controller.reverse();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _handleTapDown(TapDownDetails details) {
    if (!widget.enabled) return;
    setState(() => _isPressed = true);
    if (widget.haptic) HapticFeedback.selectionClick();
    _controller.forward();
  }

  void _handleTapUp(TapUpDetails details) {
    _release();
    widget.onTap?.call();
  }

  void _handleTapCancel() => _release();

  void _release() {
    if (!_isPressed) return;
    setState(() => _isPressed = false);
    _controller.reverse();
  }

  @override
  Widget build(BuildContext context) {
    final canInteract = widget.enabled && (widget.onTap != null || widget.onLongPress != null);

    return Semantics(
      button: widget.onTap != null,
      enabled: widget.enabled,
      child: GestureDetector(
        onTapDown: canInteract ? _handleTapDown : null,
        onTapUp: canInteract ? _handleTapUp : null,
        onTapCancel: canInteract ? _handleTapCancel : null,
        onLongPress: widget.enabled ? widget.onLongPress : null,
        behavior: widget.behavior,
        excludeFromSemantics: true,
        child: AnimatedBuilder(
          animation: _scaleAnim,
          builder: (context, child) => Transform.scale(
            scale: _scaleAnim.value,
            child: child,
          ),
          child: widget.child,
        ),
      ),
    );
  }
}
