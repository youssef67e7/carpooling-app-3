import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/providers/wallet_provider.dart';
import '../../core/theme/weret_tokens.dart';
import '../wallet/wallet_labels.dart';

class DriverEarningsWalletScreen extends ConsumerStatefulWidget {
  const DriverEarningsWalletScreen({super.key});

  @override
  ConsumerState<DriverEarningsWalletScreen> createState() => _DriverEarningsWalletScreenState();
}

class _DriverEarningsWalletScreenState extends ConsumerState<DriverEarningsWalletScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(walletProvider.notifier).refresh());
  }

  String _formatAmount(num value) {
    return NumberFormat.currency(symbol: '\$', decimalDigits: 2).format(value);
  }

  String _formatDate(dynamic raw) {
    final d = DateTime.tryParse('$raw');
    if (d == null) return '';
    return DateFormat('MMM d, yyyy • h:mm a').format(d.toLocal());
  }

  IconData _txIcon(String type) {
    switch (type) {
      case 'deposit':
        return Icons.add;
      case 'withdraw':
        return Icons.send;
      default:
        return Icons.receipt_long;
    }
  }

  @override
  Widget build(BuildContext context) {
    final w = ref.watch(walletProvider);
    final txs = w.transactions.take(8).toList();

    return Scaffold(
      backgroundColor: WeretTokens.bg,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(20, 48, 20, 28),
            decoration: const BoxDecoration(
              color: WeretTokens.brand,
              borderRadius: BorderRadius.only(bottomLeft: Radius.circular(28), bottomRight: Radius.circular(28)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('driverWalletBalance'.tr(), style: const TextStyle(color: Colors.white70, fontSize: 13)),
                const SizedBox(height: 8),
                Text(_formatAmount(w.totalBalance), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 36)),
                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.white,
                          side: const BorderSide(color: Colors.white54),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                        ),
                        onPressed: () => context.push('/driver/earnings/top-up'),
                        icon: const Icon(Icons.add, size: 18),
                        label: Text('driverWalletTopUp'.tr()),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: FilledButton.icon(
                        style: FilledButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: WeretTokens.brand,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                        ),
                        onPressed: () => context.push('/driver/earnings/withdraw'),
                        icon: const Icon(Icons.send, size: 18),
                        label: Text('driverWalletTransfer'.tr()),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => ref.read(walletProvider.notifier).refresh(),
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('driverRecentActivities'.tr(), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
                      TextButton(onPressed: () => context.push('/driver/earnings/activities'), child: Text('seeAll'.tr())),
                    ],
                  ),
                  const SizedBox(height: 8),
                  if (txs.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 40),
                      child: Center(child: Text('walletNoTx'.tr(), style: const TextStyle(color: WeretTokens.textSecondary))),
                    )
                  else
                    ...txs.map((raw) {
                      final tx = Map<String, dynamic>.from(raw as Map);
                      final type = '${tx['type'] ?? ''}';
                      final amt = num.tryParse('${tx['amount'] ?? 0}') ?? 0;
                      final isCredit = type == 'deposit' || type == 'ride_payment' || type == 'ride_refund';
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Row(
                          children: [
                            Container(
                              width: 44,
                              height: 44,
                              decoration: BoxDecoration(
                                color: WeretTokens.brand,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Icon(_txIcon(type), color: Colors.white, size: 20),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(walletTxTypeLabel(type), style: const TextStyle(fontWeight: FontWeight.w700)),
                                  Text(_formatDate(tx['createdAt']), style: const TextStyle(color: WeretTokens.textSecondary, fontSize: 12)),
                                ],
                              ),
                            ),
                            Text(
                              '${isCredit ? '+' : '-'}${_formatAmount(amt.abs())}',
                              style: TextStyle(fontWeight: FontWeight.w800, color: isCredit ? WeretTokens.success : WeretTokens.textPrimary),
                            ),
                          ],
                        ),
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

class DriverRecentActivitiesScreen extends ConsumerStatefulWidget {
  const DriverRecentActivitiesScreen({super.key});

  @override
  ConsumerState<DriverRecentActivitiesScreen> createState() => _DriverRecentActivitiesScreenState();
}

class _DriverRecentActivitiesScreenState extends ConsumerState<DriverRecentActivitiesScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(walletProvider.notifier).fetchTransactions());
  }

  @override
  Widget build(BuildContext context) {
    final txs = ref.watch(walletProvider).transactions;
    return Scaffold(
      appBar: AppBar(
        backgroundColor: WeretTokens.brand,
        foregroundColor: Colors.white,
        title: Text('driverRecentActivities'.tr()),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _ActivityTile(title: 'driverActivityDebitCards'.tr(), subtitle: 'driverActivityDebitCardsHint'.tr(), onTap: () => context.push('/driver/earnings/add-card')),
          _ActivityTile(title: 'driverActivityInstapay'.tr(), subtitle: 'driverActivityInstapayHint'.tr(), onTap: () => context.push('/driver/earnings/add-account')),
          const SizedBox(height: 16),
          ...txs.map((raw) {
            final tx = Map<String, dynamic>.from(raw as Map);
            return ListTile(
              title: Text(walletTxTypeLabel('${tx['type'] ?? ''}')),
              subtitle: Text('${tx['createdAt'] ?? ''}'),
              trailing: Text('${tx['amount'] ?? 0}', style: const TextStyle(fontWeight: FontWeight.w800)),
            );
          }),
        ],
      ),
    );
  }
}

class _ActivityTile extends StatelessWidget {
  const _ActivityTile({required this.title, required this.subtitle, required this.onTap});
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: WeretTokens.border.withValues(alpha: 0.5))),
      ),
      child: ListTile(
        contentPadding: EdgeInsets.zero,
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
        subtitle: Row(
          children: [
            const Icon(Icons.schedule, size: 14, color: WeretTokens.textSecondary),
            const SizedBox(width: 4),
            Expanded(child: Text(subtitle, style: const TextStyle(fontSize: 12, color: WeretTokens.textSecondary))),
          ],
        ),
        trailing: const Icon(Icons.chevron_right, color: WeretTokens.textSecondary),
        onTap: onTap,
      ),
    );
  }
}
