import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/passenger_home_screen.dart';
import '../../features/auth/passenger_history_screen.dart';
import '../../features/auth/settings_screen.dart';
import '../../features/more/passenger_more_menu_screen.dart';
import '../../features/safety/safety_hub_screen.dart';
import '../../features/wallet/wallet_overview_screen.dart';
import '../../features/wallet/wallet_screens.dart';
import '../../features/auth/driver_onboarding_screen.dart';
import '../../features/more/info_screens.dart';
import '../../features/more/notification_settings_screen.dart';
import '../../features/auth/user_dispute_screen.dart';
import '../../features/auth/user_dispute_chat_screen.dart';
import '../../features/more/favorite_drivers_screen.dart';
import '../../features/more/carpool_search_screen.dart';
import '../../features/more/my_carpools_screen.dart';
import '../../features/more/saved_places_screen.dart';
import '../../features/more/payment_methods_screen.dart';
import '../../features/more/promotions_screen.dart';
import '../../features/more/referral_screen.dart';
import '../../shared/widgets/weret_shell_scaffold.dart';

class PassengerShell extends StatelessWidget {
  const PassengerShell({super.key, required this.navigationShell});
  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context) {
    return WeretShellScaffold(
      navigationShell: navigationShell,
      destinations: [
        NavigationDestination(icon: const Icon(Icons.home_outlined), label: 'tabHome'.tr()),
        NavigationDestination(icon: const Icon(Icons.history), label: 'history'.tr()),
        NavigationDestination(icon: const Icon(Icons.menu), label: 'tabMore'.tr()),
        NavigationDestination(icon: const Icon(Icons.settings_outlined), label: 'settings'.tr()),
      ],
    );
  }

  static StatefulShellBranch homeBranch() => StatefulShellBranch(
        routes: [GoRoute(path: '/passenger/home', builder: (_, __) => const PassengerHomeScreen())],
      );

  static StatefulShellBranch historyBranch() => StatefulShellBranch(
        routes: [GoRoute(path: '/passenger/history', builder: (_, __) => const PassengerHistoryScreen())],
      );

  static StatefulShellBranch moreBranch() => StatefulShellBranch(
        routes: [
          GoRoute(
            path: '/passenger/more',
            builder: (_, __) => const PassengerMoreMenuScreen(),
            routes: [
              GoRoute(
                path: 'wallet',
                builder: (_, __) => const WalletOverviewScreen(),
                routes: [
                  GoRoute(path: 'deposit', builder: (_, __) => const WalletDepositScreen()),
                  GoRoute(path: 'withdraw', builder: (_, __) => const WalletWithdrawScreen()),
                  GoRoute(path: 'history', builder: (_, __) => const WalletHistoryScreen()),
                  GoRoute(path: 'add-account', builder: (_, __) => const WalletAddAccountScreen()),
                ],
              ),
              GoRoute(path: 'driver-onboarding', builder: (_, __) => const DriverOnboardingScreen()),
              GoRoute(path: 'ride-tips', builder: (_, __) => const RideTipsScreen()),
              GoRoute(path: 'saved-places', builder: (_, __) => const SavedPlacesScreen()),
              GoRoute(path: 'payment-methods', builder: (_, __) => const PaymentMethodsScreen()),
              GoRoute(path: 'promotions', builder: (_, __) => const PromotionsScreen()),
              GoRoute(path: 'referral', builder: (_, __) => const ReferralScreen()),
              GoRoute(path: 'notifications', builder: (_, __) => const NotificationSettingsScreen()),
              GoRoute(path: 'help', builder: (_, __) => const HelpCenterScreen()),
              GoRoute(path: 'safety', builder: (_, __) => const SafetyHubScreen()),
              GoRoute(path: 'favorite-drivers', builder: (_, __) => const FavoriteDriversScreen()),
              GoRoute(path: 'find-carpool', builder: (_, __) => const CarpoolSearchScreen()),
              GoRoute(path: 'my-carpools', builder: (_, __) => const MyCarpoolsScreen()),
              GoRoute(path: 'disputes', builder: (_, __) => const UserDisputeScreen()),
              GoRoute(path: 'disputes/:id', builder: (c, s) => UserDisputeChatScreen(disputeId: s.pathParameters['id']!)),
              GoRoute(path: 'about', builder: (_, __) => const AboutWeretScreen()),
            ],
          ),
        ],
      );

  static StatefulShellBranch settingsBranch() => StatefulShellBranch(
        routes: [GoRoute(path: '/passenger/settings', builder: (_, __) => const SettingsScreen())],
      );
}
