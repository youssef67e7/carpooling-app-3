import 'package:flutter/material.dart';
import '../../core/theme/weret_tokens.dart';

class WeretScreenScaffold extends StatelessWidget {
  const WeretScreenScaffold({
    super.key,
    required this.title,
    required this.rnSource,
    required this.child,
    this.actions,
  });

  final String title;
  final String rnSource;
  final Widget child;
  final List<Widget>? actions;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WeretTokens.bg,
      appBar: AppBar(
        title: Text(title),
        actions: actions,
        backgroundColor: WeretTokens.surface,
        surfaceTintColor: WeretTokens.surface,
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (rnSource.isNotEmpty)
            Container(
              color: WeretTokens.neutralSoft,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              child: Text(
                'RN: $rnSource',
                style: const TextStyle(
                  fontSize: 12,
                  color: WeretTokens.textMuted,
                ),
              ),
            ),
          Expanded(child: child),
        ],
      ),
    );
  }
}
