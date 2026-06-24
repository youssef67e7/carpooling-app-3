import 'package:flutter/material.dart';
import '../weret_logo.dart';

/// Animated WERET mark — alias for [WeretLogo].
class WeretBrandMark extends StatelessWidget {
  const WeretBrandMark({super.key, this.hero = true, this.onDark = false});

  final bool hero;
  final bool onDark;

  @override
  Widget build(BuildContext context) {
    return hero ? const WeretLogo.hero() : WeretLogo.standard(onDark: onDark);
  }
}
