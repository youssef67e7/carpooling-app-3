import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/driver_home_screen.dart';
import '../../features/auth/settings_screen.dart';
import '../../features/auth/user_dispute_screen.dart';
import '../../features/auth/user_dispute_chat_screen.dart';
import '../../features/more/info_screens.dart';
import '../../features/more/create_carpool_screen.dart';
import '../../features/more/my_carpools_screen.dart';
import '../../features/more/referral_screen.dart';
import '../../features/wallet/wallet_screens.dart';
import '../../features/driver/driver_profile_screen.dart';
import '../../features/driver/driver_earnings_wallet_screen.dart';
import '../../features/driver/driver_wallet_flow_screens.dart';
import '../../features/driver/driver_bonus_screen.dart';
import '../../shared/widgets/weret_shell_scaffold.dart';

class DriverShell extends StatelessWidget {
  const DriverShell({super.key, required this.navigationShell});
  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context) {
    return WeretShellScaffold(
      navigationShell: navigationShell,
      destinations: [
        NavigationDestination(icon: const Icon(Icons.local_taxi_outlined), label: 'driverTabRequests'.tr()),
        NavigationDestination(icon: const Icon(Icons.payments_outlined), label: 'driverTabEarnings'.tr()),
        NavigationDestination(icon: const Icon(Icons.person_outline), label: 'driverTabProfile'.tr()),
      ],
    );
  }

  static List<StatefulShellBranch> branches() => [
        StatefulShellBranch(routes: [GoRoute(path: '/driver/home', builder: (_, __) => const DriverHomeScreen())]),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/driver/earnings',
              builder: (_, __) => const DriverEarningsWalletScreen(),
              routes: [
                GoRoute(path: 'top-up', builder: (_, __) => const DriverTopUpAmountScreen()),
                GoRoute(path: 'add-card', builder: (_, __) => const DriverAddCardScreen()),
                GoRoute(
                  path: 'confirm-password',
                  builder: (c, s) {
                    final extra = s.extra as Map<String, dynamic>? ?? {};
                    return DriverConfirmPasswordScreen(
                      amount: extra['amount'] as num? ?? 0,
                      fees: extra['fees'] as num? ?? 0,
                    );
                  },
                ),
                GoRoute(
                  path: 'success',
                  builder: (c, s) {
                    final extra = s.extra as Map<String, dynamic>? ?? {};
                    return DriverTopUpSuccessScreen(total: extra['total'] as num? ?? 0);
                  },
                ),
                GoRoute(path: 'activities', builder: (_, __) => const DriverRecentActivitiesScreen()),
                GoRoute(path: 'deposit', builder: (_, __) => const WalletDepositScreen()),
                GoRoute(path: 'withdraw', builder: (_, __) => const WalletWithdrawScreen()),
                GoRoute(path: 'add-account', builder: (_, __) => const WalletAddAccountScreen()),
              ],
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/driver/profile',
              builder: (_, __) => const DriverProfileScreen(),
              routes: [
                GoRoute(path: 'help', builder: (_, __) => const HelpCenterScreen()),
                GoRoute(path: 'settings', builder: (_, __) => const SettingsScreen()),
                GoRoute(path: 'bonuses', builder: (_, __) => const DriverBonusScreen()),
                GoRoute(path: 'disputes', builder: (_, __) => const UserDisputeScreen()),
                GoRoute(path: 'disputes/:id', builder: (c, s) => UserDisputeChatScreen(disputeId: s.pathParameters['id']!)),
                GoRoute(path: 'create-carpool', builder: (_, __) => const CreateCarpoolScreen()),
                GoRoute(path: 'my-carpools', builder: (_, __) => const MyCarpoolsScreen()),
                GoRoute(path: 'referral', builder: (_, __) => const ReferralScreen()),
              ],
            ),
          ],
        ),
      ];
}
