import 'package:flutter/material.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/weret_screen_scaffold.dart';

class AdminRidesScreen extends StatelessWidget {
  const AdminRidesScreen({super.key});

  static const routeName = 'AdminRidesScreen';

  @override
  Widget build(BuildContext context) {
    return WeretScreenScaffold(
      title: 'AdminRides',
      rnSource: 'screens/AdminRidesScreen.js',
      child: const EmptyState(icon: Icons.route_outlined, title: 'adminRides', subtitle: 'comingSoon'),
    );
  }
}
