import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/ride_provider.dart';
import '../../core/theme/weret_tokens.dart';

class DriverRatingsScreen extends ConsumerStatefulWidget {
  const DriverRatingsScreen({super.key});

  @override
  ConsumerState<DriverRatingsScreen> createState() => _DriverRatingsScreenState();
}

class _DriverRatingsScreenState extends ConsumerState<DriverRatingsScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(rideProvider.notifier).fetchDriverRatings());
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(rideProvider);
    final summary = state.driverRatingSummary;
    final ratings = state.driverRatings;

    return Scaffold(
      appBar: AppBar(title: Text('driverRatingsPerTripIntro'.tr().split(':').first.trim())),
      body: RefreshIndicator(
        onRefresh: () => ref.read(rideProvider.notifier).fetchDriverRatings(),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (summary != null)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      const Icon(Icons.star_rounded, color: WeretTokens.textMuted, size: 40),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${summary['averageRating'] ?? '—'}',
                            style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w900),
                          ),
                          Text(
                            '${summary['ratingCount'] ?? 0} ${'submitRating'.tr()}',
                            style: const TextStyle(color: WeretTokens.textSecondary),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 8),
            Text('driverRatingsPerTripIntro'.tr(), style: const TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            if (ratings.isEmpty)
              Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  'driverRatingPendingFromPassenger'.tr(),
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: WeretTokens.textSecondary),
                ),
              )
            else
              ...ratings.map((r) {
                final passenger = r['passenger'] is Map ? (r['passenger'] as Map)['name'] : null;
                return Card(
                  margin: const EdgeInsets.only(bottom: 10),
                  child: ListTile(
                    leading: CircleAvatar(
                      child: Text('${r['rating'] ?? '?'}'),
                    ),
                    title: Text(passenger?.toString() ?? '—'),
                    subtitle: Text('${r['review'] ?? ''}'),
                    trailing: const Icon(Icons.star, color: WeretTokens.textMuted, size: 18),
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }
}
