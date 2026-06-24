import 'package:flutter/material.dart';
import '../../core/theme/weret_tokens.dart';
import 'weret_ambient_background.dart';

class WeretPageScaffold extends StatelessWidget {
  const WeretPageScaffold({
    super.key,
    required this.title,
    this.actions,
    this.leading,
    this.body,
    this.child,
    this.bottom,
    this.floatingActionButton,
    this.automaticBack = true,
    this.useLargeTitle = false,
    this.centerTitle = true,
  });

  final String title;
  final List<Widget>? actions;
  final Widget? leading;
  final Widget? body;
  final Widget? child;
  final Widget? bottom;
  final Widget? floatingActionButton;
  final bool automaticBack;
  final bool useLargeTitle;
  final bool centerTitle;

  @override
  Widget build(BuildContext context) {
    final content = body ?? child ?? const SizedBox.shrink();
    final canPop = Navigator.canPop(context);

    if (useLargeTitle) {
      return Scaffold(
        backgroundColor: WeretTokens.bg,
        floatingActionButton: floatingActionButton,
        bottomNavigationBar: bottom,
        body: WeretAmbientBackground(
          child: SafeArea(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (canPop && automaticBack)
                  Align(
                    alignment: AlignmentDirectional.centerStart,
                    child: IconButton(
                      icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
                      onPressed: () => Navigator.maybePop(context),
                    ),
                  ),
                Expanded(child: content),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: WeretTokens.bg,
      appBar: AppBar(
        automaticallyImplyLeading: automaticBack && canPop,
        leading: leading,
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
        centerTitle: centerTitle,
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        actions: actions,
      ),
      floatingActionButton: floatingActionButton,
      bottomNavigationBar: bottom,
      body: WeretAmbientBackground(child: SafeArea(child: content)),
    );
  }
}
