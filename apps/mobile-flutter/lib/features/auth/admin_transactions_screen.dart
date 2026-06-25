import 'package:flutter/material.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/weret_screen_scaffold.dart';

class AdminTransactionsScreen extends StatelessWidget {
  const AdminTransactionsScreen({super.key});

  static const routeName = 'AdminTransactionsScreen';

  @override
  Widget build(BuildContext context) {
    return WeretScreenScaffold(
      title: 'AdminTransactions',
      rnSource: 'screens/AdminTransactionsScreen.js',
      child: const EmptyState(icon: Icons.receipt_outlined, title: 'adminTransactions', subtitle: 'comingSoon'),
    );
  }
}
