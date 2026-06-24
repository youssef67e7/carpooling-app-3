import 'package:flutter/material.dart';

import '../../core/theme/weret_tokens.dart';

/// Page backdrop — matches web `.layout-login` ambient circles.
class WeretAmbientBackground extends StatelessWidget {
  const WeretAmbientBackground({super.key, required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        const ColoredBox(color: WeretTokens.bg),
        const _LoginAmbientShapes(),
        child,
      ],
    );
  }
}

class _LoginAmbientShapes extends StatelessWidget {
  const _LoginAmbientShapes();

  @override
  Widget build(BuildContext context) {
    final isRtl = Directionality.of(context) == TextDirection.rtl;
    return IgnorePointer(
      child: Stack(
        children: [
          Positioned(
            top: -90,
            right: isRtl ? null : -70,
            left: isRtl ? -70 : null,
            child: _blob(280, 0.035),
          ),
          Positioned(
            bottom: -120,
            left: isRtl ? null : -80,
            right: isRtl ? -80 : null,
            child: _blob(320, 0.05),
          ),
        ],
      ),
    );
  }

  Widget _blob(double size, double opacity) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.black.withValues(alpha: opacity),
      ),
    );
  }
}
