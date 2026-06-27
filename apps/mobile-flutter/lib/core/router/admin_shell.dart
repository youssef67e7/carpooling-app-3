import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/admin_screens.dart';
import '../../features/auth/settings_screen.dart';
import '../../features/auth/admin_dispute_screen.dart';
import '../../features/auth/admin_dispute_detail_screen.dart';
import '../../features/auth/legacy_screens.dart';
import '../../features/more/info_screens.dart';
import '../../features/more/promotions_screen.dart';
import '../../shared/widgets/weret_shell_scaffold.dart';

class AdminShell extends StatelessWidget {
  const AdminShell({super.key, required this.navigationShell});
  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context) {
    return WeretShellScaffold(
      navigationShell: navigationShell,
      destinations: [
        NavigationDestination(icon: const Icon(Icons.speed_outlined), label: 'tabAdminHome'.tr()),
        NavigationDestination(icon: const Icon(Icons.people_outline), label: 'adminUsers'.tr()),
        NavigationDestination(icon: const Icon(Icons.map_outlined), label: 'adminRides'.tr()),
        NavigationDestination(icon: const Icon(Icons.grid_view_rounded), label: 'tabMore'.tr()),
        NavigationDestination(icon: const Icon(Icons.settings_outlined), label: 'settings'.tr()),
      ],
    );
  }

  static List<StatefulShellBranch> branches() => [
        StatefulShellBranch(routes: [GoRoute(path: '/admin/dashboard', builder: (_, __) => const AdminDashboardScreen())]),
        StatefulShellBranch(routes: [GoRoute(path: '/admin/users', builder: (_, __) => const AdminUsersScreen())]),
        StatefulShellBranch(routes: [GoRoute(path: '/admin/rides', builder: (_, __) => const AdminRidesScreen())]),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/admin/more',
              builder: (_, __) => const AdminMoreMenuScreen(),
              routes: [
                GoRoute(path: 'tools', builder: (_, __) => const AdminToolsScreen()),
                GoRoute(path: 'reports', builder: (_, __) => const AdminReportsScreen()),
                GoRoute(path: 'transactions', builder: (_, __) => const AdminTransactionsScreen()),
                GoRoute(path: 'audit', builder: (_, __) => const AdminAuditLogScreen()),
                GoRoute(path: 'promotions', builder: (_, __) => const PromotionsScreen(isAdmin: true)),
                GoRoute(path: 'about', builder: (_, __) => const AboutWeretScreen()),
                GoRoute(path: 'disputes', builder: (_, __) => const AdminDisputeScreen()),
                GoRoute(
                  path: 'disputes/:id',
                  builder: (c, s) => AdminDisputeDetailScreen(disputeId: s.pathParameters['id']!),
                ),
              ],
            ),
          ],
        ),
        StatefulShellBranch(routes: [GoRoute(path: '/admin/settings', builder: (_, __) => const SettingsScreen())]),
      ];
}
