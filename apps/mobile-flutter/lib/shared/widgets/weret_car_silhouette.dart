import 'dart:ui' as ui;

import 'package:flutter/material.dart';

/// WERET mark — three parallel upward curves above the wordmark (viewBox 280×38).
class WeretCarPaths {
  WeretCarPaths._();

  static const vbW = 280.0;
  static const vbH = 38.0;

  /// Bottom stripe (closest to WERET).
  static Path mainProfile(Size size) => _path(size, _stripeBottom);

  /// Middle stripe.
  static Path midAccent(Size size) => _path(size, _stripeMid);

  /// Top stripe.
  static Path rearAccent(Size size) => _path(size, _stripeTop);

  // Stripes span ~84% of viewBox — matches letter-spaced WERET width.
  static const _x0 = 22.0;
  static const _x1 = 258.0;
  static const _cx = 140.0;
  static const _bow = 6.0;

  static const _stripeTop = _PathData([
    _M(_x0, 8),
    _Q(_cx, 8 - _bow, _x1, 8),
  ]);

  static const _stripeMid = _PathData([
    _M(_x0, 18),
    _Q(_cx, 18 - _bow, _x1, 18),
  ]);

  static const _stripeBottom = _PathData([
    _M(_x0, 28),
    _Q(_cx, 28 - _bow, _x1, 28),
  ]);

  static Path _path(Size size, _PathData data) {
    final sx = size.width / vbW;
    final sy = size.height / vbH;
    final path = Path();
    for (final seg in data.segs) {
      switch (seg) {
        case _M(:final x, :final y):
          path.moveTo(x * sx, y * sy);
        case _L(:final x, :final y):
          path.lineTo(x * sx, y * sy);
        case _Q(:final cx, :final cy, :final ex, :final ey):
          path.quadraticBezierTo(cx * sx, cy * sy, ex * sx, ey * sy);
        case _C(
            :final c1x,
            :final c1y,
            :final c2x,
            :final c2y,
            :final ex,
            :final ey
          ):
          path.cubicTo(
              c1x * sx, c1y * sy, c2x * sx, c2y * sy, ex * sx, ey * sy);
      }
    }
    return path;
  }
}

class _PathData {
  const _PathData(this.segs);
  final List<Object> segs;
}

class _M {
  const _M(this.x, this.y);
  final double x;
  final double y;
}

class _L {
  const _L(this.x, this.y);
  final double x;
  final double y;
}

class _Q {
  const _Q(this.cx, this.cy, this.ex, this.ey);
  final double cx;
  final double cy;
  final double ex;
  final double ey;
}

class _C {
  const _C(this.c1x, this.c1y, this.c2x, this.c2y, this.ex, this.ey);
  final double c1x;
  final double c1y;
  final double c2x;
  final double c2y;
  final double ex;
  final double ey;
}

class _StrokeSpec {
  const _StrokeSpec(
    this.path,
    this.width,
    this.draw, {
    this.glintOffset = 0.0,
  });
  final Path path;
  final double width;
  final double draw;
  final double glintOffset;
}

/// Premium renderer — three parallel stripes bowing toward WERET.
class WeretCarSilhouettePainter extends CustomPainter {
  const WeretCarSilhouettePainter({
    required this.progress,
    required this.shimmer,
    required this.breathe,
    required this.strokeWidth,
    this.glow = 0.0,
    this.light = false,
  });

  final double progress;
  final double shimmer;
  final double breathe;
  final double strokeWidth;
  final double glow;
  final bool light;

  double _phase(double start, double span) =>
      ((progress - start) / span).clamp(0.0, 1.0);

  double get _stripeTopDraw => _phase(0.0, 0.38);
  double get _stripeMidDraw => _phase(0.1, 0.4);
  double get _stripeBottomDraw => _phase(0.2, 0.42);

  @override
  void paint(Canvas canvas, Size size) {
    final w = strokeWidth * 0.78;
    final specs = [
      _StrokeSpec(WeretCarPaths.rearAccent(size), w, _stripeTopDraw,
          glintOffset: 0.05),
      _StrokeSpec(WeretCarPaths.midAccent(size), w, _stripeMidDraw,
          glintOffset: 0.38),
      _StrokeSpec(WeretCarPaths.mainProfile(size), w, _stripeBottomDraw,
          glintOffset: 0.62),
    ];

    for (final spec in specs) {
      _paintStroke(canvas, size, spec);
    }
  }

  void _paintStroke(Canvas canvas, Size size, _StrokeSpec spec) {
    if (spec.draw <= 0) return;

    final breatheAmp = 0.55 + breathe * 0.45;

    if (!light) {
      _drawPartial(canvas, spec.path, spec.draw,
          _glowLayer(spec.width * 3.2, 0.07 * glow * breatheAmp));
      _drawPartial(canvas, spec.path, spec.draw,
          _glowLayer(spec.width * 1.8, 0.11 * glow * breatheAmp));
    }

    _drawPartial(canvas, spec.path, spec.draw, _metalStroke(size, spec.width));
    _drawPartial(canvas, spec.path, spec.draw, _coreStroke(spec.width * 0.42));

    if (spec.draw < 0.995) {
      _drawTipSpark(canvas, spec.path, spec.draw, spec.width * 0.9);
    }

    if (progress >= 0.94 && shimmer > 0) {
      _drawGlint(canvas, spec.path, spec.width, spec.glintOffset);
      _drawGlint(canvas, spec.path, spec.width * 0.55, spec.glintOffset + 0.5,
          alpha: 0.22);
    }
  }

  Paint _glowLayer(double width, double alpha) {
    return Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = width
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..color = Colors.white.withValues(alpha: alpha)
      ..maskFilter = MaskFilter.blur(BlurStyle.normal, width * 0.35);
  }

  Paint _metalStroke(Size size, double width) {
    if (light) {
      return Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = width
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round
        ..shader = ui.Gradient.linear(
          Offset(0, size.height * 0.1),
          Offset(size.width, size.height * 0.9),
          const [
            Color(0xFF71717A),
            Color(0xFF27272A),
            Color(0xFF52525B),
            Color(0xFF3F3F46)
          ],
          const [0.0, 0.45, 0.75, 1.0],
        );
    }
    return Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = width
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..shader = ui.Gradient.linear(
        Offset(size.width * 0.05, size.height * 0.05),
        Offset(size.width * 0.95, size.height * 0.95),
        const [
          Color(0xFF71717A),
          Color(0xFFD4D4D8),
          Color(0xFFFFFFFF),
          Color(0xFFF4F4F5),
          Color(0xFF9CA3AF)
        ],
        const [0.0, 0.25, 0.5, 0.72, 1.0],
      );
  }

  Paint _coreStroke(double width) {
    return Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = width
      ..strokeCap = StrokeCap.round
      ..color = light
          ? const Color(0xFF27272A).withValues(alpha: 0.62)
          : Colors.white.withValues(alpha: 0.55);
  }

  void _drawPartial(Canvas canvas, Path path, double t, Paint paint) {
    for (final metric in path.computeMetrics()) {
      canvas.drawPath(metric.extractPath(0, metric.length * t), paint);
    }
  }

  void _drawTipSpark(Canvas canvas, Path path, double t, double width) {
    for (final metric in path.computeMetrics()) {
      final len = metric.length * t;
      if (len <= 0) continue;
      final tangent = metric.getTangentForOffset(len);
      if (tangent == null) continue;
      final pos = tangent.position;
      final r = width * 0.85;
      canvas.drawCircle(
        pos,
        r,
        Paint()
          ..shader = ui.Gradient.radial(
            pos,
            r * 2.2,
            [
              Colors.white.withValues(alpha: light ? 0.35 : 0.85),
              Colors.white.withValues(alpha: 0.0),
            ],
          ),
      );
      break;
    }
  }

  void _drawGlint(Canvas canvas, Path path, double width, double phaseOffset,
      {double alpha = 0.55}) {
    for (final metric in path.computeMetrics()) {
      final len = metric.length;
      if (len <= 0) continue;
      final phase = (shimmer + phaseOffset) % 1.0;
      final head = len * phase;
      const segment = 0.14;
      final tail = (head - len * segment).clamp(0.0, len);
      final headClamped = head.clamp(0.0, len);
      if (headClamped <= tail) continue;

      final glintPaint = Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = width * 1.35
        ..strokeCap = StrokeCap.round
        ..shader = ui.Gradient.linear(
          Offset(tail, 0),
          Offset(headClamped, 0),
          [
            Colors.white.withValues(alpha: 0.0),
            Colors.white.withValues(alpha: alpha * (light ? 0.5 : 1.0)),
            Colors.white.withValues(alpha: 0.0),
          ],
          const [0.0, 0.5, 1.0],
        );
      canvas.drawPath(metric.extractPath(tail, headClamped), glintPaint);
    }
  }

  @override
  bool shouldRepaint(covariant WeretCarSilhouettePainter old) {
    return old.progress != progress ||
        old.shimmer != shimmer ||
        old.breathe != breathe ||
        old.strokeWidth != strokeWidth ||
        old.glow != glow ||
        old.light != light;
  }
}

/// Premium dark tile backdrop — grid + radial spotlight + vignette.
class WeretGridTexturePainter extends CustomPainter {
  const WeretGridTexturePainter({this.opacity = 0.06, this.breathe = 0.5});

  final double opacity;
  final double breathe;

  @override
  void paint(Canvas canvas, Size size) {
    final spot = ui.Gradient.radial(
      Offset(size.width * 0.5, size.height * 0.28),
      size.width * 0.55,
      [
        Colors.white.withValues(alpha: 0.06 + breathe * 0.03),
        Colors.white.withValues(alpha: 0.0),
      ],
    );
    canvas.drawRect(Offset.zero & size, Paint()..shader = spot);

    final grid = Paint()
      ..color = Colors.white.withValues(alpha: opacity)
      ..strokeWidth = 0.55;
    const spacing = 16.0;
    for (var x = 0.0; x <= size.width; x += spacing) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), grid);
    }
    for (var y = 0.0; y <= size.height; y += spacing) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), grid);
    }

    final road = Paint()
      ..color = Colors.white.withValues(alpha: opacity * 1.4)
      ..strokeWidth = 0.7
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(Offset(size.width * 0.08, size.height * 0.62),
        Offset(size.width * 0.92, size.height * 0.38), road);
    canvas.drawLine(Offset(size.width * 0.04, size.height * 0.82),
        Offset(size.width * 0.52, size.height * 0.55), road);

    final vignette = ui.Gradient.radial(
      Offset(size.width * 0.5, size.height * 0.5),
      size.shortestSide * 0.72,
      [
        Colors.transparent,
        Colors.black.withValues(alpha: 0.35),
      ],
      [0.55, 1.0],
    );
    canvas.drawRect(Offset.zero & size, Paint()..shader = vignette);
  }

  @override
  bool shouldRepaint(covariant WeretGridTexturePainter old) =>
      old.opacity != opacity || old.breathe != breathe;
}

/// Soft halo behind the entire car stroke group.
class WeretCarAuraPainter extends CustomPainter {
  const WeretCarAuraPainter({required this.breathe, this.light = false});

  final double breathe;
  final bool light;

  @override
  void paint(Canvas canvas, Size size) {
    if (light) return;
    final cx = size.width * 0.5;
    final cy = size.height * 0.48;
    final r = size.width * (0.34 + breathe * 0.03);
    canvas.drawOval(
      Rect.fromCenter(center: Offset(cx, cy), width: r * 2.2, height: r * 1.05),
      Paint()
        ..shader = ui.Gradient.radial(
          Offset(cx, cy),
          r,
          [
            Colors.white.withValues(alpha: 0.08 + breathe * 0.05),
            Colors.white.withValues(alpha: 0.0),
          ],
        ),
    );
  }

  @override
  bool shouldRepaint(covariant WeretCarAuraPainter old) =>
      old.breathe != breathe || old.light != light;
}
