import 'package:flutter/material.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/weret_screen_scaffold.dart';

class AdminUsersScreen extends StatelessWidget {
  const AdminUsersScreen({super.key});

  static const routeName = 'AdminUsersScreen';

  @override
  Widget build(BuildContext context) {
    return WeretScreenScaffold(
      title: 'AdminUsers',
      rnSource: 'screens/AdminUsersScreen.js',
      child: const EmptyState(icon: Icons.people_outline, title: 'adminUsers', subtitle: 'comingSoon'),
    );
  }
}
