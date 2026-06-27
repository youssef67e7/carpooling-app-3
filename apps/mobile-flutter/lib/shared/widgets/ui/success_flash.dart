import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../core/theme/weret_tokens.dart';

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
  final bool isDialog;

  const SuccessFlash({
    super.key,
    required this.message,
    this.duration = const Duration(seconds: 2),
    this.animDuration = const Duration(milliseconds: 300),
    this.onDismiss,
    this.showProgress = true,
    this.haptic = true,
    this.icon = Icons.check_circle_rounded,
    this.slideOffset = 12,
    this.padding = const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
    this.isDialog = false,
  });

  static void show(
    BuildContext context,
    String message, {
    Duration? duration,
  }) {
    showDialog(
      context: context,
      barrierDismissible: false,
      barrierColor: Colors.transparent,
      builder: (_) => SuccessFlash(
        message: message,
        duration: duration ?? const Duration(seconds: 2),
        isDialog: true,
      ),
    );
  }

  @override
  State<SuccessFlash> createState() => _SuccessFlashState();
}

class _SuccessFlashState extends State<SuccessFlash>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _fade;
  late Animation<Offset> _slide;
  Timer? _dismissTimer;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      duration: widget.animDuration,
      vsync: this,
    );
    _fade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _ctrl, curve: Curves.easeOut),
    );
    _slide = Tween<Offset>(
      begin: Offset(0, -widget.slideOffset),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(parent: _ctrl, curve: Curves.easeOutCubic),
    );
    if (widget.haptic) HapticFeedback.lightImpact();
    _ctrl.forward();
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
    _ctrl.reverse().then((_) {
      if (!mounted) return;
      if (widget.isDialog) {
        Navigator.of(context).pop();
      } else {
        widget.onDismiss?.call();
      }
    });
  }

  void _manualDismiss() {
    HapticFeedback.selectionClick();
    _dismiss();
  }

  @override
  void dispose() {
    _dismissTimer?.cancel();
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final child = Container(
      margin: widget.isDialog
          ? const EdgeInsets.symmetric(horizontal: 32)
          : null,
      decoration: BoxDecoration(
        color: WeretTokens.successSoft,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: WeretTokens.success.withValues(alpha: 0.3)),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: widget.padding,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(widget.icon, color: WeretTokens.success, size: 22),
                const SizedBox(width: 12),
                Flexible(
                  child: Text(
                    widget.message,
                    style: const TextStyle(
                      color: WeretTokens.onSuccess,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
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
    );

    if (widget.isDialog) {
      return FadeTransition(
        opacity: _fade,
        child: Material(
          color: Colors.transparent,
          child: Center(child: child),
        ),
      );
    }

    return AnimatedBuilder(
      animation: _ctrl,
      builder: (context, _) => Opacity(
        opacity: _fade.value,
        child: Transform.translate(
          offset: _slide.value,
          child: child,
        ),
      ),
    );
  }
}

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
      if (!mounted) {
        _timer?.cancel();
        return;
      }
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
