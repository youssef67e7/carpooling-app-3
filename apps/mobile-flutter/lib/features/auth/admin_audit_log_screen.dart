import 'package:flutter/material.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/weret_screen_scaffold.dart';

class AdminAuditLogScreen extends StatelessWidget {
  const AdminAuditLogScreen({super.key});

  static const routeName = 'AdminAuditLogScreen';

  @override
  Widget build(BuildContext context) {
    return WeretScreenScaffold(
      title: 'AdminAuditLog',
      rnSource: 'screens/AdminAuditLogScreen.js',
      child: const EmptyState(icon: Icons.history, title: 'adminAuditLog', subtitle: 'comingSoon'),
    );
  }
}
