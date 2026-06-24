import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/driver_provider.dart';
import '../../core/providers/wallet_provider.dart';
import '../../core/theme/weret_tokens.dart';
import '../../shared/widgets/weret_page_scaffold.dart';
import '../../shared/widgets/weret_section_card.dart';

class DriverEarningsScreen extends ConsumerStatefulWidget {
  const DriverEarningsScreen({super.key});

  @override
  ConsumerState<DriverEarningsScreen> createState() => _DriverEarningsScreenState();
}

class _DriverEarningsScreenState extends ConsumerState<DriverEarningsScreen> {
  Map<String, dynamic>? _summary;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      await ref.read(walletProvider.notifier).refresh();
      final summary = await ref.read(driverProvider.notifier).fetchEarningsSummary();
      if (mounted) setState(() => _summary = summary);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final wallet = ref.watch(walletProvider);
    final s = _summary ?? {};

    return WeretPageScaffold(
      title: 'driverEarningsTitle'.tr(),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            if (_loading)
              const Padding(padding: EdgeInsets.all(48), child: Center(child: CircularProgressIndicator(strokeWidth: 2)))
            else ...[
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(22),
                  gradient: LinearGradient(colors: [WeretTokens.brand, WeretTokens.brand.withValues(alpha: 0.85)]),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('driverEarningsTotal'.tr(), style: const TextStyle(color: Colors.white70, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    Text('${s['totalEarnings'] ?? '—'}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 36)),
                    const SizedBox(height: 4),
                    Text('${'walletTotalBalance'.tr()}: ${wallet.totalBalance}', style: const TextStyle(color: Colors.white70, fontSize: 13)),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(child: _StatTile(label: 'driverEarningsTrips'.tr(), value: '${s['completedTrips'] ?? 0}')),
                  const SizedBox(width: 10),
                  Expanded(child: _StatTile(label: 'activeRides'.tr(), value: '${s['activeTrips'] ?? 0}')),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(child: _StatTile(label: 'adminAvgRating'.tr(), value: '${s['averageRating'] ?? '—'}')),
                  const SizedBox(width: 10),
                  Expanded(child: _StatTile(label: 'driverEarningsRated'.tr(), value: '${s['ratedTrips'] ?? 0}')),
                ],
              ),
              const SizedBox(height: 20),
              WeretSectionCard(
                title: 'driverEarningsRecentTx'.tr(),
                child: wallet.transactions.isEmpty
                    ? Text('walletNoTx'.tr(), style: const TextStyle(color: WeretTokens.textSecondary))
                    : Column(
                        children: wallet.transactions.take(8).map((tx) {
                          final m = tx as Map;
                          return ListTile(
                            contentPadding: EdgeInsets.zero,
                            title: Text('${m['type'] ?? '—'}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                            subtitle: Text('${m['createdAt'] ?? ''}', style: const TextStyle(fontSize: 11)),
                            trailing: Text('${m['amount'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w800)),
                          );
                        }).toList(),
                      ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: WeretTokens.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: WeretTokens.border.withValues(alpha: 0.65)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(value, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 22)),
          const SizedBox(height: 4),
          Text(label, style: const TextStyle(color: WeretTokens.textSecondary, fontSize: 11, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
