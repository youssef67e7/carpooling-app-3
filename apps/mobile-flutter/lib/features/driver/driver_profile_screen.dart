import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/theme/weret_tokens.dart';
import '../../core/utils/logout_action.dart';
import '../../shared/widgets/more_menu_row.dart';
import '../../shared/widgets/mode_switch_row.dart';
import '../../core/utils/auth_navigation.dart';
import '../../core/utils/show_alert.dart';
import 'driver_shared_widgets.dart';

class DriverProfileScreen extends ConsumerWidget {
  const DriverProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final user = auth.user;
    final current = user?.effectiveRole == 'driver' ? 'driver' : 'passenger';

    return Scaffold(
      backgroundColor: WeretTokens.bg,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const DriverWordmark(),
            const SizedBox(height: 20),
            CircleAvatar(
              radius: 48,
              backgroundColor: WeretTokens.inputFill,
              backgroundImage: user?.profileImageUrl.isNotEmpty == true ? NetworkImage(user!.profileImageUrl) : null,
              child: user?.profileImageUrl.isNotEmpty != true ? const Icon(Icons.person, size: 48) : null,
            ),
            const SizedBox(height: 12),
            Text(user?.name ?? '', textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 20)),
            if (user?.memberSinceLabel.isNotEmpty == true)
              Text(
                'driverMemberSince'.tr(namedArgs: {'date': user!.memberSinceLabel}),
                textAlign: TextAlign.center,
                style: const TextStyle(color: WeretTokens.textSecondary, fontSize: 13),
              ),
            const SizedBox(height: 24),
            Container(
              decoration: BoxDecoration(
                color: WeretTokens.surface,
                borderRadius: BorderRadius.circular(WeretTokens.cardRadius),
                border: Border.all(color: WeretTokens.border.withValues(alpha: 0.6)),
              ),
              child: Column(
                children: [
                  MoreMenuRow(icon: Icons.person_outline, title: 'driverProfilePersonal'.tr(), subtitle: '', onTap: () => context.push('/driver/profile/settings')),
                  const Divider(height: 1),
                  MoreMenuRow(icon: Icons.account_balance_wallet_outlined, title: 'walletTitle'.tr(), subtitle: 'featureWalletSubtitle'.tr(), onTap: () => context.push('/driver/earnings/deposit')),
                  const Divider(height: 1),
                  MoreMenuRow(icon: Icons.help_outline, title: 'featureHelp'.tr(), subtitle: 'featureHelpSubtitle'.tr(), onTap: () => context.push('/driver/profile/help')),
                ],
              ),
            ),
            const SizedBox(height: 16),
            ModeSwitchRow(
              value: current,
              loading: auth.loading,
              onChanged: (next) async {
                try {
                  await ref.read(authProvider.notifier).switchRole(next);
                  if (context.mounted) context.go(AuthNavigation.homeForUser(ref.read(authProvider).user));
                } catch (e) {
                  if (context.mounted) showAlert(context, 'error'.tr(), '$e');
                }
              },
            ),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                style: FilledButton.styleFrom(
                  backgroundColor: WeretTokens.brand,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(WeretTokens.pillRadius)),
                ),
                onPressed: () async {
                  try {
                    await ref.read(authProvider.notifier).switchRole('passenger');
                    if (context.mounted) context.go('/passenger/home');
                  } catch (e) {
                    if (context.mounted) showAlert(context, 'error'.tr(), '$e');
                  }
                },
                icon: const Icon(Icons.directions_car_filled),
                label: Text('driverSwitchToUser'.tr()),
              ),
            ),
            const SizedBox(height: 16),
            TextButton.icon(
              onPressed: () => performLogout(ref, context),
              icon: const Icon(Icons.logout, color: WeretTokens.error),
              label: Text('logout'.tr(), style: const TextStyle(color: WeretTokens.error, fontWeight: FontWeight.w700)),
            ),
          ],
        ),
      ),
    );
  }
}
