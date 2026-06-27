import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/ride_provider.dart';
import '../../core/theme/weret_tokens.dart';

Future<bool?> showRatePassengerModal(
  BuildContext context,
  WidgetRef ref, {
  required Map<String, dynamic> ride,
}) {
  return showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    backgroundColor: WeretTokens.surface,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(WeretTokens.cardRadius)),
    ),
    builder: (ctx) => _RatePassengerSheet(ride: ride),
  ).then((ok) async {
    if (ok == true) {
      ref.read(rideProvider.notifier).fetchDriverActiveRides();
    }
    return ok;
  });
}

class _RatePassengerSheet extends ConsumerStatefulWidget {
  const _RatePassengerSheet({required this.ride});
  final Map<String, dynamic> ride;

  @override
  ConsumerState<_RatePassengerSheet> createState() => _RatePassengerSheetState();
}

class _RatePassengerSheetState extends ConsumerState<_RatePassengerSheet> {
  int _stars = 5;
  bool _loading = false;
  final _reviewCtrl = TextEditingController();

  @override
  void dispose() {
    _reviewCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _loading = true);
    try {
      await ref.read(rideProvider.notifier).ratePassenger(
            '${widget.ride['_id']}',
            _stars,
            review: _reviewCtrl.text.trim(),
          );
      if (!mounted) return;
      Navigator.pop(context, true);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('thanksRatingBody'.tr())),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('rateFailed'.tr())),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final passenger = widget.ride['passengerId'] is Map
        ? (widget.ride['passengerId'] as Map)['name']
        : null;

    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Rate Your Passenger', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 20)),
          if (passenger != null) ...[
            const SizedBox(height: 6),
            Text('$passenger', style: const TextStyle(color: WeretTokens.textSecondary)),
          ],
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(5, (i) {
              final n = i + 1;
              return IconButton(
                onPressed: () => setState(() => _stars = n),
                icon: Icon(
                  n <= _stars ? Icons.star_rounded : Icons.star_outline_rounded,
                  color: Colors.amber,
                  size: 36,
                ),
              );
            }),
          ),
          TextField(
            controller: _reviewCtrl,
            maxLines: 3,
            maxLength: 300,
            decoration: InputDecoration(
              labelText: 'reportDescriptionLabel'.tr(),
              hintText: 'reportDescriptionPh'.tr(),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
          const SizedBox(height: 8),
          FilledButton(
            onPressed: _loading ? null : _submit,
            child: _loading
                ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                : Text('submitRating'.tr()),
          ),
          TextButton(
            onPressed: _loading ? null : () => Navigator.pop(context, false),
            child: Text('cancel'.tr()),
          ),
        ],
      ),
    );
  }
}
