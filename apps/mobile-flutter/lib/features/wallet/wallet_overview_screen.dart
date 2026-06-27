import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/wallet_provider.dart';
import '../../core/theme/weret_tokens.dart';
import '../../shared/widgets/wallet_activity_item.dart';
import 'wallet_labels.dart';

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
    return Scaffold(
      backgroundColor: WeretTokens.bg,
      appBar: AppBar(
        title: const Text('Wallet', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
      ),
      body: Column(
        children: [
          Container(
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
                const Text('Wallet balance', style: TextStyle(color: Colors.white, fontSize: 14)),
                const SizedBox(height: 4),
                Text('EGP ${w.totalBalance.toStringAsFixed(2)}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 32)),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    OutlinedButton.icon(
                      onPressed: () => context.push('deposit'),
                      icon: const Icon(Icons.add, size: 18),
                      label: const Text('Top up'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white,
                        side: const BorderSide(color: Colors.white, width: 1.5),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(9999)),
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                      ),
                    ),
                    const SizedBox(width: 12),
                    FilledButton.icon(
                      onPressed: () => context.push('withdraw'),
                      icon: const Icon(Icons.send, size: 18),
                      label: const Text('Transfer'),
                      style: FilledButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: Colors.black,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(9999)),
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
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
                padding: const EdgeInsets.symmetric(horizontal: 16),
                children: [
                  const SizedBox(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Recent Activities', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.black)),
                      TextButton(
                        onPressed: () => context.push('history'),
                        child: const Text('View All', style: TextStyle(fontSize: 13)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  if (w.error != null)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 32),
                      child: Center(
                        child: Column(
                          children: [
                            Text(w.error!, style: const TextStyle(color: Colors.red, fontSize: 13), textAlign: TextAlign.center),
                            const SizedBox(height: 8),
                            TextButton(onPressed: () => ref.read(walletProvider.notifier).refresh(), child: const Text('Retry')),
                          ],
                        ),
                      ),
                    )
                  else if (w.loading && w.transactions.isEmpty)
                    const Padding(
                      padding: EdgeInsets.only(top: 32),
                      child: Center(child: CircularProgressIndicator()),
                    )
                  else if (w.transactions.isEmpty)
                    const Padding(
                      padding: EdgeInsets.only(top: 32),
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
