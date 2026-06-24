import 'package:flutter/material.dart';
import '../wallet/wallet_overview_screen.dart';

/// Driver wallet — same Firestore-backed wallet UI as passengers.
class DriverWalletScreen extends StatelessWidget {
  const DriverWalletScreen({super.key});

  static const routeName = 'DriverWalletScreen';

  @override
  Widget build(BuildContext context) => const WalletOverviewScreen();
}
