import 'package:flutter/material.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/weret_screen_scaffold.dart';

class AdminReportsScreen extends StatelessWidget {
  const AdminReportsScreen({super.key});

  static const routeName = 'AdminReportsScreen';

  @override
  Widget build(BuildContext context) {
    return WeretScreenScaffold(
      title: 'AdminReports',
      rnSource: 'screens/AdminReportsScreen.js',
      child: const EmptyState(icon: Icons.flag_outlined, title: 'adminReports', subtitle: 'comingSoon'),
    );
  }
}
