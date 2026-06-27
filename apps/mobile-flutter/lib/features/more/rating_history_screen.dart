import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/ride_provider.dart';
import '../../core/theme/weret_tokens.dart';
import '../../shared/widgets/weret_page_scaffold.dart';

class RatingHistoryScreen extends ConsumerStatefulWidget {
  final bool isDriver;
  const RatingHistoryScreen({super.key, this.isDriver = false});
  @override
  ConsumerState<RatingHistoryScreen> createState() => _RatingHistoryScreenState();
}

class _RatingHistoryScreenState extends ConsumerState<RatingHistoryScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      if (widget.isDriver) {
        ref.read(rideProvider.notifier).fetchDriverRatings();
      } else {
        ref.read(rideProvider.notifier).fetchPassengerRatings();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(rideProvider);
    final ratings = widget.isDriver ? s.driverRatings : s.passengerRatings;
    final summary = widget.isDriver ? s.driverRatingSummary : s.passengerRatingSummary;

    return WeretPageScaffold(
      title: widget.isDriver ? 'ratingsReceivedTitle'.tr() : 'ratingsGivenTitle'.tr(),
      body: s.ratingsLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (summary != null)
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(colors: [WeretTokens.brand, WeretTokens.brand.withValues(alpha: 0.8)]),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(children: [
                      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('ratingsSummary'.tr(), style: const TextStyle(color: Colors.white70, fontSize: 13)),
                        const SizedBox(height: 4),
                        Text((summary['averageRating'] as num?)?.toStringAsFixed(1) ?? '—', style: const TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.bold)),
                      ]),
                      const Spacer(),
                      Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                        Text('ratingsCount'.tr(), style: const TextStyle(color: Colors.white70, fontSize: 13)),
                        const SizedBox(height: 4),
                        Text('${(summary['ratingCount'] as num?)?.toInt() ?? 0}', style: const TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.bold)),
                      ]),
                    ]),
                  ),
                const SizedBox(height: 16),
                if (ratings.isEmpty)
                  Padding(
                    padding: const EdgeInsets.all(32),
                    child: Center(child: Text('ratingsEmpty'.tr(), style: TextStyle(color: WeretTokens.textMuted))),
                  )
                else
                  ...ratings.map((r) {
                    final person = widget.isDriver ? r['passenger'] : r['driver'];
                    final name = person?['name'] as String? ?? '—';
                    final rating = (r['rating'] as num?)?.toInt() ?? 0;
                    final review = r['review'] as String? ?? '';
                    return Card(
                      margin: const EdgeInsets.symmetric(vertical: 4),
                      child: ListTile(
                        leading: CircleAvatar(child: Text(name.isNotEmpty ? name[0].toUpperCase() : '?')),
                        title: Text(name),
                        subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Row(children: List.generate(5, (i) => Icon(i < rating ? Icons.star : Icons.star_border, color: WeretTokens.accent, size: 18))),
                          if (review.isNotEmpty) Text(review, style: TextStyle(color: WeretTokens.textSecondary, fontSize: 13)),
                        ]),
                      ),
                    );
                  }),
              ],
            ),
    );
  }
}
