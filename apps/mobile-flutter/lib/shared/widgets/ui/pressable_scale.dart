import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class PressableScale extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  final double scale;
  final Duration duration;
  final Duration? reverseDuration;
  final bool enabled;
  final bool haptic;
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
  late AnimationController _controller;
  late Animation<double> _scaleAnim;
  final List<CurvedAnimation> _curves = [];
  bool _isPressed = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: widget.duration,
      reverseDuration: widget.reverseDuration,
      vsync: this,
    );
    _buildAnim();
  }

  @override
  void didUpdateWidget(covariant PressableScale oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.scale != widget.scale ||
        oldWidget.duration != widget.duration ||
        oldWidget.reverseDuration != widget.reverseDuration) {
      _disposeCurves();
      _controller.duration = widget.duration;
      _controller.reverseDuration = widget.reverseDuration;
      _buildAnim();
    }
    if (!widget.enabled && _isPressed) {
      _isPressed = false;
      _controller.reverse();
    }
  }

  void _buildAnim() {
    final curved = CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic);
    _curves.add(curved);
    _scaleAnim = Tween<double>(begin: 1.0, end: widget.scale).animate(curved);
  }

  void _disposeCurves() {
    for (final c in _curves) {
      c.dispose();
    }
    _curves.clear();
  }

  void _handleTapDown(TapDownDetails details) {
    if (!widget.enabled) return;
    _isPressed = true;
    _controller.forward();
  }

  void _handleTapUp(TapUpDetails details) {
    _release();
    if (widget.haptic) HapticFeedback.lightImpact();
    widget.onTap?.call();
  }

  void _handleTapCancel() => _release();

  void _release() {
    if (!_isPressed) return;
    _isPressed = false;
    _controller.reverse();
  }

  @override
  void dispose() {
    _disposeCurves();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final canInteract =
        widget.enabled && (widget.onTap != null || widget.onLongPress != null);

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
