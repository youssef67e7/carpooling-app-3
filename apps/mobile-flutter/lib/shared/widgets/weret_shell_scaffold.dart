import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/weret_tokens.dart';

class WeretShellScaffold extends StatelessWidget {
  const WeretShellScaffold({
    super.key,
    required this.navigationShell,
    required this.destinations,
  });

  final StatefulNavigationShell navigationShell;
  final List<NavigationDestination> destinations;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WeretTokens.bg,
      body: navigationShell,
      bottomNavigationBar: NavigationBar(
        selectedIndex: navigationShell.currentIndex,
        onDestinationSelected: navigationShell.goBranch,
        backgroundColor: WeretTokens.surface,
        indicatorColor: WeretTokens.inputFill,
        height: 68,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        destinations: destinations,
      ),
    );
  }
}
