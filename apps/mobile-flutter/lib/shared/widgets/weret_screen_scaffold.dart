import 'package:flutter/material.dart';

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
      appBar: AppBar(title: Text(title), actions: actions),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (rnSource.isNotEmpty)
            Material(
              color: Theme.of(context).colorScheme.surfaceContainerHighest,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                child: Text('RN: $rnSource', style: Theme.of(context).textTheme.labelSmall),
              ),
            ),
          Expanded(child: child),
        ],
      ),
    );
  }
}
