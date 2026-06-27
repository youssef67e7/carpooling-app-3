import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';

import '../../core/providers/ride_provider.dart';
import '../../core/theme/weret_tokens.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/error_state.dart';
import '../../shared/widgets/shimmer_loading.dart';
import '../../shared/widgets/weret_page_scaffold.dart';
import '../../shared/widgets/admin_cards.dart';

const _pad = 16.0;
const _hGap = 8.0;

class PassengerHistoryScreen extends ConsumerStatefulWidget {
  const PassengerHistoryScreen({super.key});
  @override
  ConsumerState<PassengerHistoryScreen> createState() => _PassengerHistoryScreenState();
}

class _PassengerHistoryScreenState extends ConsumerState<PassengerHistoryScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(rideProvider.notifier).fetchHistory());
  }

  Future<void> _refresh() async {
    HapticFeedback.mediumImpact();
    await ref.read(rideProvider.notifier).fetchHistory();
  }

  @override
  Widget build(BuildContext context) {
    final ride = ref.watch(rideProvider);
    final history = ride.history;
    final loading = ride.loading;
    final error = ride.error;

    Widget body;
    if (loading && history.isEmpty) {
      body = ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: List.generate(5, (_) => const _HistoryShimmerItem()),
      );
    } else if (error != null && history.isEmpty) {
      body = ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          const SizedBox(height: 120),
          ErrorState(message: error, onRetry: _refresh),
        ],
      );
    } else if (history.isEmpty) {
      body = ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          const SizedBox(height: 120),
          EmptyState(title: 'noRides'.tr(), subtitle: 'pullToRefresh'.tr(), icon: Icons.history),
        ],
      );
    } else {
      body = ListView.builder(
        padding: const EdgeInsets.all(_pad),
        physics: const AlwaysScrollableScrollPhysics(),
        itemCount: history.length + 1,
        itemBuilder: (c, i) {
          if (i == 0) {
            return Padding(
              padding: const EdgeInsets.only(bottom: _hGap),
              child: Text(
                'history'.tr(),
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: WeretTokens.textPrimary),
              ),
            );
          }
          return _RideHistoryItem(ride: history[i - 1] as Map<String, dynamic>);
        },
      );
    }

    return WeretPageScaffold(
      title: 'history'.tr(),
      body: RefreshIndicator(onRefresh: _refresh, child: body),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Extracted Widgets
// ═══════════════════════════════════════════════════════════════════════

class _HistoryShimmerItem extends StatelessWidget {
  const _HistoryShimmerItem();

  @override
  Widget build(BuildContext context) {
    return ShimmerLoading(
      isLoading: true,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: _pad, vertical: _hGap + 4),
        child: Row(
          children: [
            ShimmerBox(width: 48, height: 48, borderRadius: BorderRadius.circular(24)),
            const SizedBox(width: _hGap + 4),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ShimmerBox(height: 14, width: double.infinity),
                  const SizedBox(height: _hGap),
                  ShimmerBox(height: 10, width: 120),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RideHistoryItem extends StatelessWidget {
  const _RideHistoryItem({required this.ride});
  final Map<String, dynamic> ride;

  @override
  Widget build(BuildContext context) {
    return AdminRideCard(ride: ride);
  }
}
