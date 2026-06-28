import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/ride_provider.dart';
import '../../core/theme/weret_tokens.dart';

const _reasons = [
  'cancelReasonChangeMind',
  'cancelReasonDriverDelay',
  'cancelReasonFoundRide',
  'cancelReasonWrongAddress',
  'cancelReasonPrice',
  'cancelReasonAppIssue',
  'cancelReasonOther',
];

Future<bool> showCancelRideDialog(BuildContext context, WidgetRef ref, String rideId, {bool isDriver = false}) async {
  String? selectedReason;
  final confirmed = await showDialog<Object?>(
    context: context,
    barrierDismissible: false,
    builder: (ctx) {
      return StatefulBuilder(builder: (ctx, setSheetState) {
        return AlertDialog(
          title: Text('cancelRideTitle'.tr()),
          content: SizedBox(
            width: double.maxFinite,
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('cancelRideReason'.tr(), style: TextStyle(color: WeretTokens.textSecondary, fontSize: 14)),
              const SizedBox(height: 12),
              ..._reasons.map((r) => RadioListTile<String>(
                    title: Text(r.tr(), style: const TextStyle(fontSize: 14)),
                    value: r,
                    groupValue: selectedReason,
                    onChanged: (v) => setSheetState(() => selectedReason = v),
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                  )),
            ]),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.of(ctx).pop(null), child: Text('cancel'.tr())),
            FilledButton(
              onPressed: () {
                final popped = selectedReason;
                Navigator.of(ctx).pop(popped == null ? true : popped);
              },
              child: Text('confirm'.tr()),
            ),
          ],
        );
      });
    },
  );
  if (confirmed == null) return false;
  try {
    final reason = selectedReason != null ? selectedReason!.tr() : null;
    if (isDriver) {
      await ref.read(rideProvider.notifier).driverCancelRide(rideId, reason: reason);
    } else {
      await ref.read(rideProvider.notifier).cancelRide(rideId, reason: reason);
    }
    return true;
  } catch (_) {
    return false;
  }
}
