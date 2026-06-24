import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../core/theme/weret_tokens.dart';
import 'weret_car_silhouette.dart';

enum _LogoMotion { full, subtle, still }

/// Animated WERET brand — premium car strokes + metallic wordmark.
class WeretLogo extends StatefulWidget {
  const WeretLogo({
    super.key,
    this.markWidth,
    this.height = 104,
    this.compact = false,
    this.showTile,
    this.onDark = false,
    this.animate,
  });

  final double? markWidth;
  final double height;
  final bool compact;
  final bool? showTile;
  final bool onDark;
  final bool? animate;

  const WeretLogo.hero({super.key, this.animate})
      : markWidth = 184,
        height = 112,
        compact = false,
        showTile = true,
        onDark = false;

  const WeretLogo.standard({super.key, this.onDark = false, this.animate})
      : markWidth = 164,
        height = 100,
        compact = false,
        showTile = null;

  /// Light surfaces — three strokes + wordmark, no dark tile.
  const WeretLogo.onLight({super.key})
      : markWidth = 164,
        height = 100,
        compact = false,
        showTile = false,
        onDark = false,
        animate = false;

  const WeretLogo.chip({super.key})
      : markWidth = 124,
        height = 50,
        compact = true,
        showTile = false,
        onDark = false,
        animate = null;

  /// Breadcrumb / inline headers — strokes + wordmark, no tile.
  const WeretLogo.inline({super.key})
      : markWidth = 76,
        height = 38,
        compact = true,
        showTile = false,
        onDark = false,
        animate = false;

  /// AppBar — full three-stroke mark on light chrome.
  const WeretLogo.appBar({super.key})
      : markWidth = 108,
        height = 48,
        compact = true,
        showTile = false,
        onDark = false,
        animate = null;

  @override
  State<WeretLogo> createState() => _WeretLogoState();
}

class _WeretLogoState extends State<WeretLogo> with TickerProviderStateMixin {
  late final AnimationController _entrance;
  late final AnimationController _shimmer;
  late final AnimationController _float;
  late final AnimationController _breathe;
  late final Animation<double> _fade;
  late final Animation<double> _scale;
  late final Animation<double> _draw;
  late final Animation<double> _glow;

  static const _carAspect = WeretCarPaths.vbW / WeretCarPaths.vbH;

  double get _width {
    if (widget.markWidth != null) return widget.markWidth!;
    if (widget.compact && widget.height <= 40) return 92;
    if (widget.compact) return widget.height * 1.35;
    return widget.height * 1.65;
  }

  bool get _showTile => widget.showTile ?? (!widget.compact && !widget.onDark);

  _LogoMotion get _motion {
    if (widget.animate == false) return _LogoMotion.still;
    if (widget.animate == true) return _LogoMotion.full;
    if (widget.compact || _width <= 100) return _LogoMotion.subtle;
    return _LogoMotion.full;
  }

  @override
  void initState() {
    super.initState();
    final motion = _motion;

    _entrance = AnimationController(
      vsync: this,
      duration: Duration(milliseconds: motion == _LogoMotion.full ? 1600 : 1000),
    );
    _shimmer = AnimationController(
      vsync: this,
      duration: Duration(milliseconds: motion == _LogoMotion.still ? 1 : 2400),
    );
    _float = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 3600),
    );
    _breathe = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2800),
    );

    _fade = CurvedAnimation(parent: _entrance, curve: const Interval(0.0, 0.5, curve: Curves.easeOut));
    _scale = Tween<double>(begin: 0.9, end: 1.0).animate(
      CurvedAnimation(parent: _entrance, curve: const Interval(0.0, 0.75, curve: Curves.elasticOut)),
    );
    _draw = CurvedAnimation(parent: _entrance, curve: const Interval(0.0, 0.95, curve: Curves.easeInOutCubicEmphasized));
    _glow = TweenSequence<double>([
      TweenSequenceItem(tween: Tween(begin: 0.0, end: 1.0), weight: 45),
      TweenSequenceItem(tween: Tween(begin: 1.0, end: 0.5), weight: 55),
    ]).animate(CurvedAnimation(parent: _entrance, curve: Curves.easeInOut));

    if (motion == _LogoMotion.still) {
      _entrance.value = 1.0;
      _breathe.value = 0.5;
    } else {
      _entrance.forward();
      _breathe.repeat(reverse: true);
    }

    if (motion != _LogoMotion.still) {
      _shimmer.repeat();
      if (motion == _LogoMotion.full) {
        _float.repeat(reverse: true);
      }
    }
  }

  @override
  void dispose() {
    _entrance.dispose();
    _shimmer.dispose();
    _float.dispose();
    _breathe.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: Listenable.merge([_entrance, _shimmer, _float, _breathe]),
      builder: (context, _) {
        final floatY = _motion == _LogoMotion.full ? math.sin(_float.value * math.pi * 2) * 1.6 : 0.0;
        return Transform.translate(
          offset: Offset(0, floatY),
          child: Opacity(
            opacity: _fade.value,
            child: Transform.scale(
              scale: _scale.value,
              child: _showTile ? _darkTileMark() : _markColumn(onDark: widget.onDark),
            ),
          ),
        );
      },
    );
  }

  Widget _darkTileMark() {
    final w = _width;
    final pad = w * 0.11;
    final radius = w * 0.09;
    final breathe = _breathe.value;

    return Container(
      width: w + pad * 2,
      padding: EdgeInsets.fromLTRB(pad, pad, pad, pad * 0.82),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(radius),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF0F0F11), Color(0xFF1A1A1F), Color(0xFF121214), Color(0xFF0D0D0F)],
          stops: [0.0, 0.35, 0.7, 1.0],
        ),
        border: Border.all(color: Colors.white.withValues(alpha: 0.07 + breathe * 0.04)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.35),
            blurRadius: w * 0.08,
            offset: Offset(0, w * 0.035),
          ),
          BoxShadow(
            color: Colors.white.withValues(alpha: 0.04 + breathe * 0.03),
            blurRadius: w * 0.12,
            spreadRadius: -w * 0.02,
          ),
        ],
      ),
      child: Stack(
        children: [
          Positioned.fill(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(radius),
              child: CustomPaint(
                painter: WeretGridTexturePainter(opacity: 0.07, breathe: breathe),
              ),
            ),
          ),
          _markColumn(onDark: true),
        ],
      ),
    );
  }

  Widget _markColumn({required bool onDark}) {
    final w = _width;
    final fontSize = (w * 0.096).clamp(9.5, 19.0);
    final lightStrokes = !onDark && !_showTile;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        _carStrokes(w, light: lightStrokes),
        SizedBox(height: w * 0.022),
        _wordmark(fontSize, light: lightStrokes),
      ],
    );
  }

  Widget _carStrokes(double width, {required bool light}) {
    final stroke = (width / 280 * 6.2).clamp(light ? 2.4 : 2.0, 7.0);
    final carH = width / _carAspect;

    return SizedBox(
      width: width,
      height: carH,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CustomPaint(
            size: Size(width, carH),
            painter: WeretCarAuraPainter(breathe: _breathe.value, light: light),
          ),
          CustomPaint(
            size: Size(width, carH),
            painter: WeretCarSilhouettePainter(
              progress: _motion == _LogoMotion.still ? 1.0 : _draw.value,
              shimmer: _motion == _LogoMotion.still ? 0.0 : _shimmer.value,
              breathe: _breathe.value,
              strokeWidth: stroke,
              glow: light ? 0.0 : _glow.value,
              light: light,
            ),
          ),
        ],
      ),
    );
  }

  Widget _wordmark(double fontSize, {required bool light}) {
    final shimmer = _shimmer.value;
    final breathe = _breathe.value;

    final text = ShaderMask(
      blendMode: BlendMode.srcIn,
      shaderCallback: (bounds) {
        final slide = light ? shimmer * 1.5 - 0.25 : shimmer * 2.0 - 0.45;
        return LinearGradient(
          begin: Alignment(-1.3 + slide, -0.35),
          end: Alignment(0.3 + slide, 0.55),
          colors: light
              ? const [
                  Color(0xFF3F3F46),
                  Color(0xFF71717A),
                  Color(0xFF18181B),
                  Color(0xFF52525B),
                  Color(0xFF3F3F46),
                ]
              : const [
                  Color(0xFF71717A),
                  Color(0xFFE4E4E7),
                  Color(0xFFFFFFFF),
                  Color(0xFFD4D4D8),
                  Color(0xFFA1A1AA),
                  Color(0xFF71717A),
                ],
        ).createShader(bounds);
      },
      child: Text(
        'WERET',
        textAlign: TextAlign.center,
        style: TextStyle(
          fontSize: fontSize,
          fontWeight: FontWeight.w800,
          letterSpacing: fontSize * 0.1,
          height: 1.0,
          color: light ? WeretTokens.textPrimary : Colors.white,
        ),
      ),
    );

    if (light) return text;

    return DecoratedBox(
      decoration: BoxDecoration(
        boxShadow: [
          BoxShadow(
            color: Colors.white.withValues(alpha: 0.06 + breathe * 0.04),
            blurRadius: fontSize * 0.8,
          ),
        ],
      ),
      child: text,
    );
  }
}

const kWeretAppBarLogoHeight = 56.0;
