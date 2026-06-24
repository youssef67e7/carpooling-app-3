import 'package:flutter/material.dart';

class WeretListScreen extends StatelessWidget {
  const WeretListScreen({super.key, required this.child, this.padding = 16});
  final Widget child;
  final double padding;
  @override
  Widget build(BuildContext context) {
    return SafeArea(child: SingleChildScrollView(padding: EdgeInsets.all(padding), child: child));
  }
}
