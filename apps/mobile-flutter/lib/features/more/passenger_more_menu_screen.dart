import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/utils/auth_navigation.dart';
import '../../core/utils/logout_action.dart';
import '../../shared/widgets/weret_list_screen.dart';
import '../../shared/widgets/more_menu_row.dart';
import '../../shared/widgets/mode_switch_row.dart';
import '../../shared/widgets/weret_page_scaffold.dart';
import '../../core/theme/weret_tokens.dart';
import '../../core/utils/show_alert.dart';

class PassengerMoreMenuScreen extends ConsumerWidget {
  const PassengerMoreMenuScreen({super.key});

  static const _rows = [
    ('walletTitle', 'featureWalletSubtitle', Icons.wallet, '/passenger/more/wallet'),
    ('becomeDriverTitle', 'becomeDriverSubtitle', Icons.directions_car, '/passenger/more/driver-onboarding'),
    ('featureRideTips', 'featureRideTipsSubtitle', Icons.map, '/passenger/more/ride-tips'),
    ('featureSavedPlaces', 'featureSavedPlacesSubtitle', Icons.bookmark, '/passenger/more/saved-places'),
    ('featureNotifications', 'featureNotificationsSubtitle', Icons.notifications, '/passenger/more/notifications'),
    ('featureHelp', 'featureHelpSubtitle', Icons.help, '/passenger/more/help'),
    ('featureSafety', 'featureSafetySubtitle', Icons.shield, '/passenger/more/safety'),
    ('featureAbout', 'featureAboutSubtitle', Icons.info, '/passenger/more/about'),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final user = auth.user;
    final current = user?.effectiveRole == 'driver' ? 'driver' : 'passenger';
    return WeretPageScaffold(
      title: 'tabMore'.tr(),
      body: WeretListScreen(
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: WeretTokens.surface,
                borderRadius: BorderRadius.circular(WeretTokens.cardRadius),
                border: Border.all(color: WeretTokens.border.withValues(alpha: 0.7)),
              ),
              child: ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(user?.name ?? '', textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w700)),
                subtitle: Text('modePassenger'.tr(), textAlign: TextAlign.center),
              ),
            ),
            ModeSwitchRow(
              value: current,
              loading: auth.loading,
              onChanged: (next) async {
                try {
                  await ref.read(authProvider.notifier).switchRole(next);
                  if (context.mounted) context.go(AuthNavigation.homeForUser(ref.read(authProvider).user));
                } catch (e) {
                  if (context.mounted) showAlert(context, 'error'.tr(), '$e');
                  if (next == 'driver' && context.mounted) context.push('/passenger/more/driver-onboarding');
                }
              },
            ),
            const SizedBox(height: 12),
            ..._rows.map((r) => MoreMenuRow(
                  icon: r.$3,
                  title: r.$1.tr(),
                  subtitle: r.$2.tr(),
                  onTap: () => context.push(r.$4),
                )),
            const SizedBox(height: 12),
            MoreMenuRow(
              icon: Icons.logout,
              title: 'logout'.tr(),
              subtitle: 'logoutConfirm'.tr(),
              onTap: () => performLogout(ref, context),
            ),
          ],
        ),
      ),
    );
  }
}
