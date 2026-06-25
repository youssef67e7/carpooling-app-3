import 'package:flutter/material.dart';
import '../../shared/widgets/empty_state.dart';

/// Migrated from React Native: screens/wallet/WalletHistoryScreen.js
/// Status: generated stub — wire business logic from mobile-legacy reference.
class WalletHistoryScreen extends StatelessWidget {
  const WalletHistoryScreen({super.key});

  static const routeName = 'WalletHistoryScreen';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('WalletHistory'),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
      ),
      body: const Center(child: EmptyState(icon: Icons.account_balance_wallet_outlined, title: 'walletHistory', subtitle: 'comingSoon')),
    );
  }
}
