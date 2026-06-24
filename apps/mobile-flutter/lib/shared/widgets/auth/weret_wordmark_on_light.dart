import 'package:flutter/material.dart';

import '../weret_logo.dart';

/// WERET on light surfaces — three strokes + wordmark (no dark tile).
class WeretWordmarkOnLight extends StatelessWidget {
  const WeretWordmarkOnLight({super.key, this.compact = false});

  final bool compact;

  @override
  Widget build(BuildContext context) {
    if (compact) return const WeretLogo.inline();
    return const WeretLogo.onLight();
  }
}
