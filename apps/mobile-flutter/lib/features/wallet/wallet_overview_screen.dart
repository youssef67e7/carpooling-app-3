import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/wallet_provider.dart';
import '../../core/theme/app_styles.dart';
import '../../core/theme/weret_tokens.dart';
import '../../shared/widgets/wallet_activity_item.dart';
import 'wallet_labels.dart';

// ignore_for_file: unused_element
const _xs = 8.0;
const _sm = 12.0;
const _fieldGap = 14.0;
const _md = 16.0;
const _lg = 24.0;
const _xl = 32.0;
const _xxl = 60.0;

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

  // ── Helpers ──
  void _withHaptic(VoidCallback action) {
    HapticFeedback.selectionClick();
    action();
  }

  // ── Build ──
  @override
  Widget build(BuildContext context) {
    final w = ref.watch(walletProvider);
    return Scaffold(
      backgroundColor: WeretTokens.bg,
      appBar: AppBar(
        title: Text('walletTitle'.tr(), style: AppStyles.title),
        centerTitle: true,
      ),
      body: Column(
        children: [
          _BrandHeader(balance: w.totalBalance, onTopUp: () => _withHaptic(() => context.push('deposit')), onTransfer: () => _withHaptic(() => context.push('withdraw'))),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => ref.read(walletProvider.notifier).refresh(),
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: _md),
                children: [
                  const SizedBox(height: _lg),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('driverRecentActivities'.tr(), style: AppStyles.headlineSmall),
                      TextButton(
                        onPressed: () => _withHaptic(() => context.push('history')),
                        child: Text('seeAll'.tr(), style: const TextStyle(fontSize: 13)),
                      ),
                    ],
                  ),
                  const SizedBox(height: _xs),
                  if (w.error != null)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: _xl),
                      child: Center(
                        child: Column(
                          children: [
                            Text(w.error!, style: AppStyles.bodySmall.copyWith(color: WeretTokens.error), textAlign: TextAlign.center),
                            const SizedBox(height: _xs),
                            TextButton(onPressed: () { HapticFeedback.selectionClick(); ref.read(walletProvider.notifier).refresh(); }, child: Text('retry'.tr())),
                          ],
                        ),
                      ),
                    )
                  else if (w.loading && w.transactions.isEmpty)
                    const Padding(
                      padding: EdgeInsets.only(top: _xl),
                      child: Center(child: CircularProgressIndicator()),
                    )
                  else if (w.transactions.isEmpty)
                    const Padding(
                      padding: EdgeInsets.only(top: _xl),
                      child: Center(child: Text('No recent activity', style: TextStyle(color: WeretTokens.textMuted))),
                    )
                  else
                    ...w.transactions.map((tx) {
                      final m = Map<String, dynamic>.from(tx as Map);
                      final type = '${m['type'] ?? ''}';
                      final amt = m['amount'] ?? 0;
                      final created = m['createdAt']?.toString() ?? '';
                      final isCredit = type == 'deposit' || type == 'ride_payment' || type == 'ride_refund';
                      final icon = isCredit ? Icons.add : Icons.send;
                      final date = created.length >= 10 ? created.substring(0, 10) : created;
                      return WalletActivityItem(
                        icon: icon,
                        title: walletTxTypeLabel(type),
                        subtitle: date,
                        amount: '${isCredit ? '+' : '-'}EGP ${amt.toStringAsFixed(2)}',
                        isCredit: isCredit,
                      );
                    }),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Branded header widget ──

class _BrandHeader extends StatelessWidget {
  const _BrandHeader({required this.balance, required this.onTopUp, required this.onTransfer});

  final num balance;
  final VoidCallback onTopUp;
  final VoidCallback onTransfer;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      height: 160,
      decoration: const BoxDecoration(
        color: WeretTokens.brand,
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(30),
          bottomRight: Radius.circular(30),
        ),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text('walletTotalBalance'.tr(), style: const TextStyle(color: WeretTokens.surface, fontSize: 14)),
          const SizedBox(height: 4),
          Text('EGP ${balance.toStringAsFixed(2)}', style: const TextStyle(color: WeretTokens.surface, fontWeight: FontWeight.bold, fontSize: 32)),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Flexible(
                fit: FlexFit.loose,
                child: OutlinedButton.icon(
                  onPressed: onTopUp,
                  icon: const Icon(Icons.add, size: 18),
                  label: Text('walletAddMoney'.tr()),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: WeretTokens.surface,
                    side: const BorderSide(color: WeretTokens.surface, width: 1.5),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(9999)),
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Flexible(
                fit: FlexFit.loose,
                child: FilledButton.icon(
                  onPressed: onTransfer,
                  icon: const Icon(Icons.send, size: 18),
                  label: Text('walletWithdraw'.tr()),
                  style: FilledButton.styleFrom(
                    backgroundColor: WeretTokens.surface,
                    foregroundColor: WeretTokens.brand,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(9999)),
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
