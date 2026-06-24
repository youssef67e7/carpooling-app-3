import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../core/providers/ride_provider.dart';
import '../../shared/widgets/admin_cards.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/weret_page_scaffold.dart';

class DriverHistoryScreen extends ConsumerStatefulWidget {
  const DriverHistoryScreen({super.key});

  @override
  ConsumerState<DriverHistoryScreen> createState() => _DriverHistoryScreenState();
}

class _DriverHistoryScreenState extends ConsumerState<DriverHistoryScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(rideProvider.notifier).fetchHistory());
  }

  Future<void> _refresh() => ref.read(rideProvider.notifier).fetchHistory();

  @override
  Widget build(BuildContext context) {
    final history = ref.watch(rideProvider).history;
    return WeretPageScaffold(
      title: 'history'.tr(),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: history.isEmpty
            ? ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: [
                  const SizedBox(height: 120),
                  EmptyState(title: 'noRides'.tr(), subtitle: 'pullToRefresh'.tr(), icon: Icons.history),
                ],
              )
            : ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: history.length,
                itemBuilder: (c, i) => AdminRideCard(ride: history[i] as Map<String, dynamic>),
              ),
      ),
    );
  }
}
