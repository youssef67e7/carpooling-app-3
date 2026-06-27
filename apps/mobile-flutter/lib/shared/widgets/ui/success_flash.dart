import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../core/theme/weret_tokens.dart';

/// A self-dismissing success banner with fade + slide entrance/exit,
/// optional progress bar, and manual dismiss.
///
/// ```dart
/// SuccessFlash(
///   message: 'Profile updated',
///   onDismiss: () => setState(() => _showFlash = false),
/// )
/// ```
class SuccessFlash extends StatefulWidget {
  final String message;
  final Duration duration;
  final Duration animDuration;
  final VoidCallback? onDismiss;
  final bool showProgress;
  final bool haptic;
  final IconData icon;
  final double slideOffset;
  final EdgeInsetsGeometry padding;

  const SuccessFlash({
    super.key,
    required this.message,
    this.duration = const Duration(seconds: 3),
    this.animDuration = const Duration(milliseconds: 300),
    this.onDismiss,
    this.showProgress = true,
    this.haptic = true,
    this.icon = Icons.check_circle_rounded,
    this.slideOffset = 12,
    this.padding = const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
  });

  @override
  State<SuccessFlash> createState() => _SuccessFlashState();
}

class _SuccessFlashState extends State<SuccessFlash>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fade;
  late Animation<Offset> _slide;
  Timer? _dismissTimer;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: widget.animDuration,
      vsync: this,
    );

    _fade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOut),
    );
    _slide = Tween<Offset>(
      begin: Offset(0, -widget.slideOffset),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic),
    );

    if (widget.haptic) HapticFeedback.lightImpact();

    _controller.forward();
    _scheduleDismiss();
  }

  @override
  void didUpdateWidget(covariant SuccessFlash oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.duration != widget.duration) {
      _dismissTimer?.cancel();
      _scheduleDismiss();
    }
  }

  void _scheduleDismiss() {
    _dismissTimer?.cancel();
    _dismissTimer = Timer(widget.duration, _dismiss);
  }

  void _dismiss() {
    if (!mounted) return;
    _dismissTimer?.cancel();
    _controller.reverse().then((_) {
      if (mounted) widget.onDismiss?.call();
    });
  }

  void _manualDismiss() {
    HapticFeedback.selectionClick();
    _dismiss();
  }

  @override
  void dispose() {
    _dismissTimer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) => Opacity(
        opacity: _fade.value,
        child: Transform.translate(
          offset: _slide.value,
          child: child,
        ),
      ),
      child: Container(
        decoration: BoxDecoration(
          color: WeretTokens.successSoft,
          borderRadius: BorderRadius.circular(WeretTokens.fieldRadius),
          border: Border.all(color: WeretTokens.success.withValues(alpha: 0.3)),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: widget.padding,
              child: Row(
                children: [
                  Icon(widget.icon, color: WeretTokens.success, size: 22),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      widget.message,
                      style: const TextStyle(
                        color: WeretTokens.onSuccess,
                        fontSize: 14,
                        height: 1.4,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 8),
                  _DismissButton(onTap: _manualDismiss),
                ],
              ),
            ),
            if (widget.showProgress)
              _CountdownBar(
                duration: widget.duration,
                color: WeretTokens.success,
              ),
          ],
        ),
      ),
    );
  }
}

/// Close button — 28×28 touch target with 16×16 icon.
class _DismissButton extends StatelessWidget {
  final VoidCallback onTap;
  const _DismissButton({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 28,
      height: 28,
      child: IconButton(
        icon: const Icon(Icons.close, size: 16, color: WeretTokens.textMuted),
        padding: EdgeInsets.zero,
        constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
        tooltip: 'Dismiss',
        onPressed: onTap,
      ),
    );
  }
}

/// Thin bar that drains left-to-right over [duration], then stops.
class _CountdownBar extends StatefulWidget {
  final Duration duration;
  final Color color;
  const _CountdownBar({required this.duration, required this.color});

  @override
  State<_CountdownBar> createState() => _CountdownBarState();
}

class _CountdownBarState extends State<_CountdownBar> {
  double _progress = 1.0;
  Timer? _timer;

  static const _tick = Duration(milliseconds: 50);

  @override
  void initState() {
    super.initState();
    final steps = (widget.duration.inMilliseconds / _tick.inMilliseconds).ceil();
    final decrement = 1.0 / steps;
    _timer = Timer.periodic(_tick, (_) {
      if (!mounted) { _timer?.cancel(); return; }
      setState(() {
        _progress = (_progress - decrement).clamp(0.0, 1.0);
        if (_progress <= 0) _timer?.cancel();
      });
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 3,
      child: LinearProgressIndicator(
        value: _progress,
        backgroundColor: Colors.transparent,
        valueColor: AlwaysStoppedAnimation<Color>(
          widget.color.withValues(alpha: 0.4),
        ),
        minHeight: 3,
      ),
    );
  }
}
