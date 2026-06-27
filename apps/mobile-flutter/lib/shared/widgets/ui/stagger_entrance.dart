import 'package:flutter/material.dart';

/// Direction each child slides in from.
enum StaggerDirection { down, up, left, right }

/// Staggers the entrance of [children] with a fade + slide animation,
/// each delayed by [delayPerChild] after the previous one.
///
/// ```dart
/// StaggerEntrance(
///   spacing: 12,
///   children: [
///     SettingsRow(icon: Icons.notifications, title: 'Notifications'),
///     SettingsRow(icon: Icons.lock, title: 'Privacy'),
///   ],
/// )
/// ```
class StaggerEntrance extends StatefulWidget {
  final List<Widget> children;
  final Duration delayPerChild;
  final Duration duration;
  final double offset;
  final StaggerDirection direction;
  final double spacing;
  final CrossAxisAlignment crossAxisAlignment;

  const StaggerEntrance({
    super.key,
    required this.children,
    this.delayPerChild = const Duration(milliseconds: 80),
    this.duration = const Duration(milliseconds: 300),
    this.offset = 20,
    this.direction = StaggerDirection.down,
    this.spacing = 0,
    this.crossAxisAlignment = CrossAxisAlignment.start,
  });

  @override
  State<StaggerEntrance> createState() => _StaggerEntranceState();
}

class _StaggerEntranceState extends State<StaggerEntrance>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  final List<CurvedAnimation> _curves = [];
  late List<Animation<double>> _opacities;
  late List<Animation<Offset>> _translations;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this);
    _rebuildAnimations();
    _controller.forward();
  }

  @override
  void didUpdateWidget(covariant StaggerEntrance oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.children.length != widget.children.length ||
        oldWidget.duration != widget.duration ||
        oldWidget.delayPerChild != widget.delayPerChild ||
        oldWidget.offset != widget.offset ||
        oldWidget.direction != widget.direction) {
      _disposeCurves();
      _rebuildAnimations();
      _controller.forward(from: 0);
    }
  }

  void _rebuildAnimations() {
    final count = widget.children.length;

    if (count == 0) {
      _controller.duration = Duration.zero;
      _opacities = const [];
      _translations = const [];
      return;
    }

    final totalMs =
        widget.duration.inMilliseconds + widget.delayPerChild.inMilliseconds * (count - 1);
    _controller.duration = Duration(milliseconds: totalMs);

    final begin = _beginOffset();
    _opacities = [];
    _translations = [];

    for (int i = 0; i < count; i++) {
      final start = (widget.delayPerChild.inMilliseconds * i) / totalMs;
      final end = (widget.duration.inMilliseconds +
              widget.delayPerChild.inMilliseconds * i) /
          totalMs;

      final curve = CurvedAnimation(
        parent: _controller,
        curve: Interval(start, end.clamp(0.0, 1.0)),
      );
      _curves.add(curve);

      _opacities.add(
        Tween<double>(begin: 0.0, end: 1.0).animate(
          CurvedAnimation(parent: curve, curve: Curves.easeOut),
        ),
      );
      _translations.add(
        Tween<Offset>(begin: begin, end: Offset.zero).animate(
          CurvedAnimation(parent: curve, curve: Curves.easeOutCubic),
        ),
      );
    }
  }

  Offset _beginOffset() => switch (widget.direction) {
        StaggerDirection.down  => Offset(0, widget.offset),
        StaggerDirection.up    => Offset(0, -widget.offset),
        StaggerDirection.left  => Offset(-widget.offset, 0),
        StaggerDirection.right => Offset(widget.offset, 0),
      };

  void _disposeCurves() {
    for (final c in _curves) { c.dispose(); }
    _curves.clear();
  }

  @override
  void dispose() {
    _disposeCurves();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.children.isEmpty) return const SizedBox.shrink();

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        final count = widget.children.length;
        return Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: widget.crossAxisAlignment,
          children: List.generate(count, (i) {
            return Padding(
              padding: EdgeInsets.only(
                bottom: i < count - 1 ? widget.spacing : 0,
              ),
              child: Opacity(
                opacity: _opacities[i].value,
                child: Transform.translate(
                  offset: _translations[i].value,
                  child: widget.children[i],
                ),
              ),
            );
          }),
        );
      },
    );
  }
}
