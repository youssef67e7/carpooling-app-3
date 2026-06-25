import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../core/providers/ride_provider.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/error_state.dart';
import '../../shared/widgets/shimmer_loading.dart';
import '../../shared/widgets/weret_page_scaffold.dart';
import '../../shared/widgets/admin_cards.dart';

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

  Future<void> _refresh() => ref.read(rideProvider.notifier).fetchHistory();

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
        children: List.generate(5, (_) => _shimmerItem()),
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
        padding: const EdgeInsets.all(16),
        itemCount: history.length,
        itemBuilder: (c, i) => AdminRideCard(ride: history[i] as Map<String, dynamic>),
      );
    }

    return WeretPageScaffold(
      title: 'history'.tr(),
      body: RefreshIndicator(onRefresh: _refresh, child: body),
    );
  }

  Widget _shimmerItem() {
    return ShimmerLoading(
      isLoading: true,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            ShimmerBox(width: 48, height: 48, borderRadius: BorderRadius.circular(24)),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ShimmerBox(height: 14, width: double.infinity),
                  const SizedBox(height: 8),
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
