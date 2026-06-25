import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/ride_provider.dart';
import '../../core/theme/weret_tokens.dart';
import 'report_user_modal.dart';

class ActiveRidePanel extends ConsumerWidget {
  const ActiveRidePanel({super.key, required this.ride, this.compact = false});
  final Map<String, dynamic> ride;
  final bool compact;

  String _statusLabel(String status) {
    final key = 'rideStatus_$status';
    final t = key.tr();
    return t == key ? status : t;
  }

  IconData _statusIcon(String status) {
    switch (status) {
      case 'pending':
        return Icons.hourglass_empty;
      case 'accepted':
        return Icons.person_pin_circle;
      case 'driver_arriving':
        return Icons.directions_car;
      case 'passenger_onboard':
        return Icons.person;
      case 'ongoing':
        return Icons.navigation;
      case 'completed':
        return Icons.check_circle;
      default:
        return Icons.local_taxi;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final rideId = '${ride['_id']}';
    final status = '${ride['status'] ?? ''}';
    final fare = ride['agreedFare'] ?? ride['estimatedFare'] ?? ride['passengerMinFare'] ?? '—';
    final driver = ride['driver'] is Map
        ? (ride['driver'] as Map)['name']
        : ride['driverId'] is Map
            ? (ride['driverId'] as Map)['name']
            : ride['driverName'];
    final driverId = ride['driverId'] is Map ? (ride['driverId'] as Map)['_id'] : ride['driverId'];
    final awaitingConfirm = ride['awaitingDriverConfirm'] == true;

    final statusLine = status == 'driver_arriving'
        ? 'Your driver is on the way'
        : status == 'passenger_onboard'
            ? 'You\'re in the car — heading to destination'
            : status == 'ongoing'
                ? 'Trip in progress'
                : status == 'completed'
                    ? 'Trip completed'
                    : null;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [WeretTokens.brand, WeretTokens.brand.withValues(alpha: 0.88)],
        ),
        borderRadius: BorderRadius.circular(WeretTokens.cardRadius),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.12), blurRadius: 12, offset: const Offset(0, 4))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Icon(_statusIcon(status), color: Colors.white70, size: 18),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  awaitingConfirm ? 'passengerAwaitingDriverConfirm'.tr() : _statusLabel(status),
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 16),
                ),
              ),
              Text('$fare', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 18)),
            ],
          ),
          if (statusLine != null) ...[
            const SizedBox(height: 6),
            Text(statusLine, style: const TextStyle(color: Colors.white70, fontSize: 13)),
          ],
          if (driver != null) ...[
            const SizedBox(height: 8),
            Text('${'driver'.tr()}: $driver', style: const TextStyle(color: Colors.white70, fontSize: 13)),
          ],
          if (!compact) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => context.push('/ride-chat/$rideId'),
                    icon: const Icon(Icons.chat_bubble_outline, size: 18),
                    label: Text('rideChatTitle'.tr()),
                    style: OutlinedButton.styleFrom(foregroundColor: Colors.white, side: const BorderSide(color: Colors.white54)),
                  ),
                ),
                if (const {'pending', 'accepted', 'driver_arriving', 'passenger_onboard'}.contains(status)) ...[
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () async {
                        final confirm = await showDialog<bool>(
                          context: context,
                          builder: (ctx) => AlertDialog(
                            title: Text('cancelRideTitle'.tr()),
                            content: Text('cancelRideConfirm'.tr()),
                            actions: [
                              TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: Text('no'.tr())),
                              FilledButton(onPressed: () => Navigator.of(ctx).pop(true), child: Text('yesCancel'.tr())),
                            ],
                          ),
                        );
                        if (confirm == true) {
                          await ref.read(rideProvider.notifier).cancelRide(rideId);
                        }
                      },
                      icon: const Icon(Icons.cancel_outlined, size: 18),
                      label: Text('cancelRide'.tr()),
                      style: OutlinedButton.styleFrom(foregroundColor: Colors.white70, side: const BorderSide(color: Colors.white38)),
                    ),
                  ),
                ],
              ],
            ),
            if (driverId != null && '$driverId'.isNotEmpty) ...[
              const SizedBox(height: 8),
              OutlinedButton.icon(
                onPressed: () => showReportUserModal(
                  context,
                  ref,
                  reportedUserId: '$driverId',
                  rideId: rideId,
                  reportedName: driver?.toString(),
                ),
                icon: const Icon(Icons.flag_outlined, size: 18),
                label: Text('reportUserTitle'.tr()),
                style: OutlinedButton.styleFrom(foregroundColor: Colors.white70, side: const BorderSide(color: Colors.white38)),
              ),
            ],
          ],
        ],
      ),
    );
  }
}
