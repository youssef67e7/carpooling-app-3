import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/ride_provider.dart';
import '../../core/theme/weret_tokens.dart';
import 'cancel_ride_dialog.dart';
import 'report_user_modal.dart';
import 'favorite_driver_button.dart';

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
            Row(
              children: [
                Expanded(child: Text('${'driver'.tr()}: $driver', style: const TextStyle(color: Colors.white70, fontSize: 13))),
                if (driverId != null && '$driverId'.isNotEmpty)
                  FavoriteDriverButton(driverId: '$driverId'),
              ],
            ),
          ],
          if (status == 'accepted' || status == 'pending') ...[
            const SizedBox(height: 10),
            _PoolingToggle(ride: ride),
          ],
          if (status == 'accepted' || status == 'ongoing' || status == 'passenger_onboard' || status == 'driver_arriving') ...[
            const SizedBox(height: 8),
            _SharedRideInfo(ride: ride),
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
                      onPressed: () => showCancelRideDialog(context, ref, rideId),
                      icon: const Icon(Icons.cancel_outlined, size: 18),
                      label: Text('cancelRide'.tr()),
                      style: OutlinedButton.styleFrom(foregroundColor: Colors.white70, side: const BorderSide(color: Colors.white38)),
                    ),
                  ),
                ],
              ],
            ),
              if (driverId != null && '$driverId'.isNotEmpty && const {'accepted', 'driver_arriving', 'passenger_onboard', 'ongoing'}.contains(status)) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => context.push('/safety/verify-driver'),
                      icon: const Icon(Icons.verified_user, size: 18),
                      label: Text('verifyDriverTitle'.tr()),
                      style: OutlinedButton.styleFrom(foregroundColor: Colors.white, side: const BorderSide(color: Colors.white54)),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => context.push('/safety/share-trip'),
                      icon: const Icon(Icons.share, size: 18),
                      label: Text('shareTripTitle'.tr()),
                      style: OutlinedButton.styleFrom(foregroundColor: Colors.white, side: const BorderSide(color: Colors.white54)),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
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
                  ),
                ],
              ),
            ],
          ],
        ],
      ),
    );
  }
}

class _PoolingToggle extends ConsumerStatefulWidget {
  final Map<String, dynamic> ride;
  const _PoolingToggle({required this.ride});

  @override
  ConsumerState<_PoolingToggle> createState() => _PoolingToggleState();
}

class _PoolingToggleState extends ConsumerState<_PoolingToggle> {
  bool _loading = false;

  @override
  Widget build(BuildContext context) {
    final poolingEnabled = widget.ride['poolingEnabled'] == true;
    final available = (widget.ride['availableSeatUnits'] as num?)?.toInt() ?? 0;
    if (available <= 0 && !poolingEnabled) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(poolingEnabled ? Icons.people_alt_rounded : Icons.people_alt_outlined, color: Colors.white70, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              poolingEnabled ? 'Sharing enabled — $available seat(s) available' : 'Enable ride sharing',
              style: const TextStyle(color: Colors.white70, fontSize: 12),
            ),
          ),
          if (_loading)
            const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)),
          if (!_loading)
            SizedBox(
              height: 28,
              child: Switch.adaptive(
                value: poolingEnabled,
                activeColor: Colors.white,
                activeTrackColor: Colors.greenAccent,
                onChanged: (v) async {
                  setState(() => _loading = true);
                  try {
                    await ref.read(rideProvider.notifier).togglePooling('${widget.ride['_id']}');
                  } catch (_) {}
                  if (mounted) setState(() => _loading = false);
                },
              ),
            ),
        ],
      ),
    );
  }
}

class _SharedRideInfo extends ConsumerWidget {
  final Map<String, dynamic> ride;
  const _SharedRideInfo({required this.ride});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bookings = ride['bookings'] as List? ?? [];
    final totalSeats = (ride['totalSeats'] as num?)?.toInt() ?? 0;
    final available = (ride['availableSeatUnits'] as num?)?.toInt() ?? 0;
    final poolingEnabled = ride['poolingEnabled'] == true;

    if (!poolingEnabled && bookings.isEmpty) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          const Icon(Icons.people, color: Colors.white70, size: 16),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              bookings.isEmpty
                  ? 'No one has joined yet'
                  : '${bookings.length} passenger(s) joined — $available/$totalSeats seats left',
              style: const TextStyle(color: Colors.white70, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }
}
