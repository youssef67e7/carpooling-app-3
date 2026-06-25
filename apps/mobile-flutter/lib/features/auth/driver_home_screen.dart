import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import '../../core/providers/ride_provider.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/services/driver_location_tracker.dart';
import '../../core/theme/weret_tokens.dart';
import '../../core/utils/geo_helpers.dart';
import '../../core/utils/map_scene_builder.dart';
import '../../shared/widgets/custom_button.dart';
import '../../shared/widgets/empty_state.dart';
import '../driver/driver_shared_widgets.dart';
import '../driver/driver_passenger_helpers.dart';
import '../../core/providers/driver_provider.dart';
import '../../shared/widgets/weret_ride_map.dart';

class DriverHomeScreen extends ConsumerStatefulWidget {
  const DriverHomeScreen({super.key});
  @override
  ConsumerState<DriverHomeScreen> createState() => _DriverHomeScreenState();
}

class _DriverHomeScreenState extends ConsumerState<DriverHomeScreen> {
  final _map = MapController();
  num _sessionEarnings = 0;
  num? _rating;

  @override
  void initState() {
    super.initState();
    Future.microtask(() async {
      await ref.read(rideProvider.notifier).fetchDriverActiveRides();
      await ref.read(rideProvider.notifier).fetchAvailable();
      await ref.read(driverProvider.notifier).refresh();
      final stats = ref.read(driverProvider).stats;
      if (stats != null && mounted) {
        setState(() {
          _sessionEarnings = stats['sessionEarnings'] as num? ?? 0;
          _rating = stats['averageRating'] as num?;
        });
      }
      _syncLocationTracker();
    });
  }

  void _syncLocationTracker() {
    final online = ref.read(authProvider).user?.isOnline ?? false;
    final tracker = ref.read(driverLocationTrackerProvider);
    if (online) {
      tracker.start();
    } else {
      tracker.stop();
    }
  }

  bool _awaitingMyConfirm(Map<String, dynamic> m, String myId) {
    if (m['awaitingDriverConfirm'] != true) return false;
    final pre = m['preassignedDriverId'];
    final preId = pre is Map ? '${pre['_id']}' : '$pre';
    return preId == myId;
  }

  String _passengerName(Map<String, dynamic> ride) {
    final p = ride['passengerId'];
    if (p is Map) return '${p['name'] ?? p['email'] ?? '—'}';
    return '—';
  }

  @override
  void dispose() {
    ref.read(driverLocationTrackerProvider).stop();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final ride = ref.watch(rideProvider);
    final user = ref.watch(authProvider).user;
    final driverPos = ref.watch(driverGpsProvider);
    final activeRides = ride.activeRides;
    final online = user?.isOnline ?? false;
    final vehicleType = user?.vehicleType ?? 'delivery';
    final myId = user?.id ?? '';
    final canTakeMore = ride.driverCanTakeMore;
    final maxC = ride.driverMaxConcurrent;

    _syncLocationTracker();

    LatLng? mapPickup;
    LatLng? mapDest;
    for (final r in activeRides) {
      mapPickup ??= pickupFromRide(r);
      mapDest ??= destinationFromRide(r);
    }
    final mapCenter = driverPos ?? mapPickup ?? mapDest ?? const LatLng(24.7136, 46.6753);
    final mapScene = buildDriverMapScene(activeRides: activeRides, driverPos: driverPos);

    return Scaffold(
      backgroundColor: WeretTokens.bg,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            await ref.read(rideProvider.notifier).fetchDriverActiveRides();
            await ref.read(rideProvider.notifier).fetchAvailable();
            await ref.read(driverProvider.notifier).refresh();
            final stats = ref.read(driverProvider).stats;
            if (stats != null && mounted) {
              setState(() {
                _sessionEarnings = stats['sessionEarnings'] as num? ?? 0;
                _rating = stats['averageRating'] as num?;
              });
            }
          },
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              const DriverWordmark(),
              if (user != null && !user.isDriverApproved) ...[
                const SizedBox(height: 12),
                GestureDetector(
                  onTap: () => context.push('/driver/verification-status'),
                  child: DriverInfoBanner(text: 'driverPendingBanner'.tr()),
                ),
              ],
              const SizedBox(height: 12),
              Align(
                alignment: Alignment.centerRight,
                child: FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: online ? WeretTokens.error : WeretTokens.success,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                  ),
                  onPressed: () async {
                    await ref.read(rideProvider.notifier).toggleDriverOnline();
                    _syncLocationTracker();
                  },
                  child: Text(online ? 'goOffline'.tr() : 'goOnline'.tr()),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  DriverStatChip(
                    label: 'driverCurrentStatus'.tr(),
                    value: online ? 'driverOnlineSearching'.tr() : 'goOffline'.tr(),
                    trailing: Container(width: 8, height: 8, decoration: BoxDecoration(color: online ? WeretTokens.success : WeretTokens.textSecondary, shape: BoxShape.circle)),
                  ),
                  const SizedBox(width: 8),
                  DriverStatChip(label: 'driverSessionEarnings'.tr(), value: '\$${_sessionEarnings.toStringAsFixed(2)}'),
                  const SizedBox(width: 8),
                  DriverStatChip(label: 'driverRating'.tr(), value: '${_rating ?? '—'}', trailing: Icon(Icons.star, size: 16, color: WeretTokens.textMuted)),
                ],
              ),
              if (activeRides.isNotEmpty) ...[
                const SizedBox(height: 16),
                WeretRideMap(
                  center: mapCenter,
                  controller: _map,
                  height: 180,
                  scene: mapScene,
                  interactive: true,
                  autoFit: true,
                ),
                const SizedBox(height: 12),
                Text('driverActiveRidesTitle'.tr(), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                const SizedBox(height: 8),
                ...activeRides.asMap().entries.map((entry) {
                  final idx = entry.key + 1;
                  final active = entry.value;
                  final status = '${active['status']}';
                  return _ActiveRideCard(
                    idx: idx,
                    status: status,
                    fare: '${active['agreedFare'] ?? active['estimatedFare'] ?? '—'}',
                    passenger: _passengerName(active),
                    onChat: () => context.push('/ride-chat/${active['_id']}'),
                    onStart: status == 'accepted' ? () => ref.read(rideProvider.notifier).startRide('${active['_id']}') : null,
                    onEnd: status == 'ongoing' ? () => ref.read(rideProvider.notifier).endRide('${active['_id']}') : null,
                  );
                }),
              ],
              if (!canTakeMore && online)
                Padding(
                  padding: const EdgeInsets.only(top: 8, bottom: 12),
                  child: Text(
                    'driverMaxRidesReached'.tr(namedArgs: {'max': '$maxC'}),
                    textAlign: TextAlign.center,
                    style: TextStyle(color: WeretTokens.error.withValues(alpha: 0.9), fontWeight: FontWeight.w600, fontSize: 13),
                  ),
                ),
              Text('driverRequestsTitle'.tr(), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
              const SizedBox(height: 12),
              if (!online)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Text('goOnline'.tr(), textAlign: TextAlign.center, style: const TextStyle(color: WeretTokens.textSecondary)),
                ),
              if (ride.availableRides.isEmpty) EmptyState(title: 'noAvailableRides'.tr()),
              ...ride.availableRides.map((r) {
                final m = Map<String, dynamic>.from(r as Map);
                final premium = m['isPremium'] == true || (m['passengerTier']?.toString().contains('premier') ?? false);
                return _RequestCard(
                  ride: m,
                  passengerName: passengerNameFromRide(m),
                  passengerSubtitle: passengerStatsLabel(m),
                  passengerImageUrl: passengerImageFromRide(m),
                  online: online,
                  canTakeMore: canTakeMore,
                  premium: premium,
                  awaitingConfirm: _awaitingMyConfirm(m, myId),
                  onTap: () => context.push('/driver/request/${m['_id']}', extra: m),
                  onAccept: () {
                    if (_awaitingMyConfirm(m, myId)) {
                      ref.read(rideProvider.notifier).driverConfirmBooking('${m['_id']}', true);
                    } else {
                      ref.read(rideProvider.notifier).acceptRide('${m['_id']}');
                    }
                  },
                  onDecline: _awaitingMyConfirm(m, myId) ? () => ref.read(rideProvider.notifier).driverConfirmBooking('${m['_id']}', false) : null,
                );
              }),
            ],
          ),
        ),
      ),
    );
  }
}

class _ActiveRideCard extends StatelessWidget {
  const _ActiveRideCard({
    required this.idx,
    required this.status,
    required this.fare,
    required this.passenger,
    required this.onChat,
    this.onStart,
    this.onEnd,
  });

  final int idx;
  final String status;
  final String fare;
  final String passenger;
  final VoidCallback onChat;
  final VoidCallback? onStart;
  final VoidCallback? onEnd;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: WeretTokens.surface,
        borderRadius: BorderRadius.circular(WeretTokens.cardRadius),
        border: Border.all(color: WeretTokens.border.withValues(alpha: 0.7)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('${'driverRideSlot'.tr(namedArgs: {'n': '$idx'})} · ${'rideStatus_$status'.tr()}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
          const SizedBox(height: 6),
          Text('${'estimatedFare'.tr()}: $fare', style: const TextStyle(color: WeretTokens.textSecondary)),
          Text('${'passenger'.tr()}: $passenger', style: const TextStyle(fontSize: 13)),
          const SizedBox(height: 10),
          OutlinedButton.icon(onPressed: onChat, icon: const Icon(Icons.chat_bubble_outline, size: 18), label: Text('rideChatTitle'.tr())),
          if (onStart != null) ...[const SizedBox(height: 8), CustomButton(title: 'startTrip'.tr(), onPressed: onStart)],
          if (onEnd != null) ...[const SizedBox(height: 8), CustomButton(title: 'endTrip'.tr(), onPressed: onEnd)],
        ],
      ),
    );
  }
}

class _RequestCard extends StatelessWidget {
  const _RequestCard({
    required this.ride,
    required this.passengerName,
    required this.passengerSubtitle,
    this.passengerImageUrl,
    required this.online,
    required this.canTakeMore,
    required this.premium,
    required this.awaitingConfirm,
    required this.onTap,
    required this.onAccept,
    this.onDecline,
  });

  final Map<String, dynamic> ride;
  final String passengerName;
  final String passengerSubtitle;
  final String? passengerImageUrl;
  final bool online;
  final bool canTakeMore;
  final bool premium;
  final bool awaitingConfirm;
  final VoidCallback onTap;
  final VoidCallback onAccept;
  final VoidCallback? onDecline;

  @override
  Widget build(BuildContext context) {
    final fare = ride['estimatedFare'] ?? ride['preassignedFare'] ?? ride['fare'] ?? '—';
    final pickup = ride['pickupAddress'] ?? ride['pickupLabel'] ?? '—';
    final dropoff = ride['dropoffAddress'] ?? ride['destinationAddress'] ?? ride['dropoffLabel'] ?? '—';

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: WeretTokens.surface,
          borderRadius: BorderRadius.circular(WeretTokens.cardRadius),
          border: Border.all(color: premium ? WeretTokens.brand : WeretTokens.border.withValues(alpha: 0.7)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (premium)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: const BoxDecoration(color: WeretTokens.brandHover, borderRadius: BorderRadius.vertical(top: Radius.circular(WeretTokens.cardRadius))),
                child: Text('driverTopRatedUser'.tr(), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 11)),
              ),
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      CircleAvatar(
                        backgroundImage: passengerImageUrl != null ? NetworkImage(passengerImageUrl!) : null,
                        child: passengerImageUrl == null ? Text(passengerName.isNotEmpty ? passengerName[0].toUpperCase() : '?') : null,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(passengerName, style: const TextStyle(fontWeight: FontWeight.w800)),
                            if (passengerSubtitle.isNotEmpty)
                              Text(passengerSubtitle, style: const TextStyle(fontSize: 12, color: WeretTokens.textSecondary))
                            else
                              Text('—', style: const TextStyle(fontSize: 12, color: WeretTokens.textSecondary)),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: premium ? WeretTokens.brandSurface : WeretTokens.inputFill,
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text('\$$fare', style: TextStyle(fontWeight: FontWeight.w800, color: premium ? WeretTokens.brand : WeretTokens.textPrimary)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  _routeRow(Icons.place_outlined, 'pickup'.tr(), '$pickup'),
                  const SizedBox(height: 8),
                  _routeRow(Icons.flag_outlined, 'destination'.tr(), '$dropoff'),
                  const SizedBox(height: 12),
                  if (awaitingConfirm && onDecline != null)
                    Row(
                      children: [
                        Expanded(child: OutlinedButton(onPressed: onDecline, child: Text('decline'.tr()))),
                        const SizedBox(width: 8),
                        Expanded(child: FilledButton(onPressed: online && canTakeMore ? onAccept : null, child: Text('accept'.tr()))),
                      ],
                    )
                  else
                    FilledButton(
                      style: FilledButton.styleFrom(
                        backgroundColor: WeretTokens.brand,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      onPressed: online && canTakeMore ? onAccept : null,
                      child: Text(premium ? 'driverAcceptPremium'.tr() : 'driverAcceptRequest'.tr()),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _routeRow(IconData icon, String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: WeretTokens.textSecondary),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label.toUpperCase(), style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: WeretTokens.textSecondary)),
              Text(value, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            ],
          ),
        ),
      ],
    );
  }
}
