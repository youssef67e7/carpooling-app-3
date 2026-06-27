import 'package:flutter/material.dart';

enum StaggerDirection { down, up, left, right }

class StaggerEntrance extends StatefulWidget {
  final List<Widget> children;
  final Duration itemDelay;
  final Duration totalDuration;
  final double offset;
  final StaggerDirection direction;
  final double spacing;
  final CrossAxisAlignment crossAxisAlignment;

  const StaggerEntrance({
    super.key,
    required this.children,
    this.itemDelay = const Duration(milliseconds: 50),
    this.totalDuration = const Duration(milliseconds: 400),
    this.offset = 20,
    this.direction = StaggerDirection.down,
    this.spacing = 16,
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
        oldWidget.totalDuration != widget.totalDuration ||
        oldWidget.itemDelay != widget.itemDelay ||
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

    final totalMs = widget.totalDuration.inMilliseconds;
    _controller.duration = widget.totalDuration;

    final begin = _beginOffset();
    _opacities = [];
    _translations = [];

    for (int i = 0; i < count; i++) {
      final start = (widget.itemDelay.inMilliseconds * i) / totalMs;
      final endClamped = 1.0.clamp(0.0, 1.0);

      final curve = CurvedAnimation(
        parent: _controller,
        curve: Interval(start.clamp(0.0, 1.0), endClamped),
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
        StaggerDirection.down => Offset(0, widget.offset),
        StaggerDirection.up => Offset(0, -widget.offset),
        StaggerDirection.left => Offset(-widget.offset, 0),
        StaggerDirection.right => Offset(widget.offset, 0),
      };

  void _disposeCurves() {
    for (final c in _curves) {
      c.dispose();
    }
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
  }
}
