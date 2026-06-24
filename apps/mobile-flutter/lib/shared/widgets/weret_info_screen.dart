import 'package:flutter/material.dart';
import '../../core/theme/weret_tokens.dart';
import 'weret_ambient_background.dart';
import 'weret_list_screen.dart';

class WeretInfoScreen extends StatelessWidget {
  const WeretInfoScreen({super.key, required this.title, required this.body});
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WeretTokens.bg,
      appBar: AppBar(
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
      ),
      body: WeretAmbientBackground(
        child: WeretListScreen(
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: WeretTokens.surface,
              borderRadius: BorderRadius.circular(WeretTokens.cardRadius),
              border: Border.all(color: WeretTokens.border.withValues(alpha: 0.75)),
            ),
            child: Text(body, style: const TextStyle(height: 1.65, fontSize: 15, color: WeretTokens.textPrimary)),
          ),
        ),
      ),
    );
  }
}
