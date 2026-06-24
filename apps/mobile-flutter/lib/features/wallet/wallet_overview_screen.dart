import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/wallet_provider.dart';
import '../../core/theme/weret_tokens.dart';
import 'wallet_labels.dart';
import '../../shared/widgets/custom_button.dart';
import '../../shared/widgets/weret_page_scaffold.dart';
import '../../shared/widgets/weret_section_card.dart';

class WalletOverviewScreen extends ConsumerStatefulWidget {
  const WalletOverviewScreen({super.key});
  @override
  ConsumerState<WalletOverviewScreen> createState() => _WalletOverviewScreenState();
}

class _WalletOverviewScreenState extends ConsumerState<WalletOverviewScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(walletProvider.notifier).refresh());
  }

  @override
  Widget build(BuildContext context) {
    final w = ref.watch(walletProvider);
    return WeretPageScaffold(
      title: 'walletTitle'.tr(),
      body: RefreshIndicator(
        onRefresh: () => ref.read(walletProvider.notifier).refresh(),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            WeretSectionCard(
              title: 'walletTotalBalance'.tr(),
              child: Text(
                '${w.totalBalance}',
                textAlign: TextAlign.center,
                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 32),
              ),
            ),
            CustomButton(title: 'walletAddMoney'.tr(), onPressed: () => context.push('deposit')),
            const SizedBox(height: 10),
            CustomButton(title: 'walletWithdraw'.tr(), variant: 'outline', onPressed: () => context.push('withdraw')),
            const SizedBox(height: 10),
            CustomButton(title: 'walletHistory'.tr(), variant: 'outline', onPressed: () => context.push('history')),
            const SizedBox(height: 10),
            CustomButton(title: 'walletAddMethod'.tr(), variant: 'outline', onPressed: () => context.push('add-account')),
            const SizedBox(height: 16),
            ...w.accounts.map((a) {
              final m = a as Map<String, dynamic>;
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: WeretTokens.surface,
                  borderRadius: BorderRadius.circular(WeretTokens.cardRadius),
                  border: Border.all(color: WeretTokens.border.withValues(alpha: 0.7)),
                ),
                child: Row(
                  children: [
                    Expanded(child: Text(walletTypeLabel('${m['walletType']}'), style: const TextStyle(fontWeight: FontWeight.w700))),
                    Text('${m['balance'] ?? 0}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }
}
