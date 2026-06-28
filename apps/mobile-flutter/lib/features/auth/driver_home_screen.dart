import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';

import '../../core/providers/ride_provider.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/driver_provider.dart';
import '../../core/services/driver_location_tracker.dart';
import '../../core/theme/weret_tokens.dart';
import '../../core/utils/geo_helpers.dart';
import '../../core/utils/map_scene_builder.dart';
import '../../shared/widgets/cancel_ride_dialog.dart';
import '../../shared/widgets/custom_button.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/ui/pressable_scale.dart';
import '../../shared/widgets/rate_passenger_modal.dart';
import '../../shared/widgets/ui/section_surface.dart';
import '../../shared/widgets/weret_ride_map.dart';
import '../driver/driver_shared_widgets.dart';
import '../driver/driver_passenger_helpers.dart';
import '../driver/driver_break_mode_widget.dart';
import '../driver/driver_heatmap_overlay.dart';
import '../driver/driver_join_requests_sheet.dart';

// ── Spacing & Config ─────────────────────────────────────────────────
const _pad = 16.0;
const _sm = 8.0;
const _md = 10.0;
const _lg = 12.0;
const _xl = 16.0;
const _xxl = 20.0;
const _defaultCenter = LatLng(24.7136, 46.6753);

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
    ref.listen(authProvider, (_, next) {
      final online = next.user?.isOnline ?? false;
      final tracker = ref.read(driverLocationTrackerProvider);
      online ? tracker.start() : tracker.stop();
    });
    Future.microtask(_fetchData);
  }

  @override
  void dispose() {
    _map.dispose();
    ref.read(driverLocationTrackerProvider).stop();
    super.dispose();
  }

  // ── Data ──────────────────────────────────────────────────────────
  Future<void> _fetchData() async {
    try {
      await ref.read(rideProvider.notifier).fetchDriverActiveRides();
      await ref.read(rideProvider.notifier).fetchAvailable();
      await ref.read(driverProvider.notifier).refresh();
    } catch (_) {}
    if (!mounted) return;
    final stats = ref.read(driverProvider).stats;
    if (stats != null) {
      setState(() {
        _sessionEarnings = stats['sessionEarnings'] as num? ?? 0;
        _rating = stats['averageRating'] as num?;
      });
    }
  }

  // ── Actions ───────────────────────────────────────────────────────
  Future<void> _toggleOnline() async {
    HapticFeedback.mediumImpact();
    await ref.read(rideProvider.notifier).toggleDriverOnline();
    final tracker = ref.read(driverLocationTrackerProvider);
    final isOnline = ref.read(authProvider).user?.isOnline ?? false;
    isOnline ? tracker.start() : tracker.stop();
    await _fetchData();
  }

  bool _awaitingMyConfirm(Map<String, dynamic> m, String myId) {
    if (m['awaitingDriverConfirm'] != true) return false;
    final pre = m['preassignedDriverId'];
    final preId = pre is Map ? '${pre['_id']}' : '$pre';
    return preId == myId;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BUILD
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  @override
  Widget build(BuildContext context) {
    final ride = ref.watch(rideProvider);
    final user = ref.watch(authProvider).user;
    final driverPos = ref.watch(driverGpsProvider);
    final activeRides = ride.activeRides;
    final online = user?.isOnline ?? false;
    final myId = user?.id ?? '';
    final canTakeMore = ride.driverCanTakeMore;
    final maxC = ride.driverMaxConcurrent;

    LatLng? mapPickup;
    LatLng? mapDest;
    for (final r in activeRides) {
      mapPickup ??= pickupFromRide(r);
      mapDest ??= destinationFromRide(r);
    }
    final mapCenter = driverPos ?? mapPickup ?? mapDest ?? _defaultCenter;
    final mapScene = buildDriverMapScene(activeRides: activeRides, driverPos: driverPos);

    return Scaffold(
      backgroundColor: WeretTokens.bg,
      floatingActionButton: activeRides.isNotEmpty
          ? FloatingActionButton(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
              child: const Icon(Icons.sos),
              onPressed: () => context.push('/safety/emergency'),
            )
          : null,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _fetchData,
          color: WeretTokens.brand,
          child: ListView(
            padding: const EdgeInsets.all(_pad),
            children: [
              // ── Header ───────────────────────────────────────
              const DriverWordmark(),

              // ── App Status Banner ────────────────────────────
              if (user != null &&
                  user.driverApplicationStatus != 'approved' &&
                  user.driverApplicationStatus != 'none') ...[
                const SizedBox(height: _xl),
                _AppStatusBanner(status: user.driverApplicationStatus),
              ],

              const SizedBox(height: _xl),

              // ── Online Toggle ─────────────────────────────────
              Align(
                alignment: Alignment.centerRight,
                child: _OnlineToggle(online: online, onTap: _toggleOnline),
              ),

              const SizedBox(height: _xl),

              // ── Stats Row ────────────────────────────────────
              _StatsRow(
                online: online,
                earnings: _sessionEarnings,
                rating: _rating,
              ),

              const SizedBox(height: _lg),

              // ── Quick Actions ────────────────────────────────
              _QuickActions(),

              // ── Active Rides Map & List ─────────────────────
              if (activeRides.isNotEmpty) ...[
                const SizedBox(height: _xl),
                SizedBox(
                  height: 180,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(WeretTokens.cardRadius),
                    child: WeretRideMap(
                      center: mapCenter,
                      controller: _map,
                      scene: mapScene,
                      interactive: true,
                      autoFit: true,
                    ),
                  ),
                ),
                const SizedBox(height: _lg),
                Text('driverActiveRidesTitle'.tr(), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                const SizedBox(height: _sm),
                ...activeRides.asMap().entries.map((entry) {
                  final idx = entry.key + 1;
                  final active = entry.value;
                  return _ActiveRideCard(
                    idx: idx,
                    status: '${active['status']}',
                    fare: '${active['agreedFare'] ?? active['estimatedFare'] ?? '—'}',
                    passenger: _passengerName(active),
                    onChat: () => context.push('/ride-chat/${active['_id']}'),
                    onArriving: '${active['status']}' == 'accepted'
                        ? () => ref.read(rideProvider.notifier).driverArriving('${active['_id']}')
                        : null,
                    onOnboard: '${active['status']}' == 'driver_arriving'
                        ? () => ref.read(rideProvider.notifier).passengerOnboard('${active['_id']}')
                        : null,
                    onStart: '${active['status']}' == 'passenger_onboard'
                        ? () => ref.read(rideProvider.notifier).startRide('${active['_id']}')
                        : null,
                    onEnd: '${active['status']}' == 'ongoing'
                        ? () async {
                            final rideData = await ref.read(rideProvider.notifier).endRide('${active['_id']}');
                            if (!mounted) return;
                            showRatePassengerModal(context, ref, ride: rideData);
                          }
                        : null,
                    onCancel: const {'accepted', 'driver_arriving', 'passenger_onboard'}.contains('${active['status']}')
                        ? () => showCancelRideDialog(context, ref, '${active['_id']}', isDriver: true)
                        : null,
                    onJoinRequests: '${active['status']}' == 'accepted'
                        ? () => showModalBottomSheet(
                              context: context,
                              isScrollControlled: true,
                              backgroundColor: Colors.transparent,
                              builder: (_) => DriverJoinRequestsSheet(rideId: '${active['_id']}'),
                            )
                        : null,
                  );
                }),
              ],

              // ── Max Rides Warning ────────────────────────────
              if (!canTakeMore && online)
                Padding(
                  padding: const EdgeInsets.only(top: _sm, bottom: _lg),
                  child: Text(
                    'driverMaxRidesReached'.tr(namedArgs: {'max': '$maxC'}),
                    textAlign: TextAlign.center,
                    style: TextStyle(color: WeretTokens.error.withValues(alpha: 0.9), fontWeight: FontWeight.w600, fontSize: 13),
                  ),
                ),

              // ── Requests Header ──────────────────────────────
              Text('driverRequestsTitle'.tr(), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
              const SizedBox(height: _lg),

              if (!online)
                Padding(
                  padding: const EdgeInsets.only(bottom: _lg),
                  child: Text('goOnline'.tr(), textAlign: TextAlign.center, style: const TextStyle(color: WeretTokens.textSecondary)),
                ),

              // ── Requests List ────────────────────────────────
              if (ride.availableRides.isEmpty)
                EmptyState(title: 'noAvailableRides'.tr())
              else
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
                        HapticFeedback.mediumImpact();
                        ref.read(rideProvider.notifier).acceptRide('${m['_id']}');
                      }
                    },
                    onDecline: _awaitingMyConfirm(m, myId)
                        ? () => ref.read(rideProvider.notifier).driverConfirmBooking('${m['_id']}', false)
                        : null,
                  );
                }),
              const SizedBox(height: _xxl),
            ],
          ),
        ),
      ),
    );
  }

  String _passengerName(Map<String, dynamic> ride) {
    final p = ride['passengerId'];
    if (p is Map) return '${p['name'] ?? p['email'] ?? '—'}';
    return '—';
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Extracted Header & Status Widgets
// ═══════════════════════════════════════════════════════════════════════

class _AppStatusBanner extends StatelessWidget {
  final String status;
  const _AppStatusBanner({required this.status});

  @override
  Widget build(BuildContext context) {
    if (status == 'rejected') {
      return PressableScale(
        scale: 0.98,
        onTap: () => context.push('/driver/verification-status'),
        child: Container(
          padding: const EdgeInsets.all(_lg),
          decoration: BoxDecoration(
            color: WeretTokens.error.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(WeretTokens.cardRadius),
            border: Border.all(color: WeretTokens.error.withValues(alpha: 0.3)),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.warning_amber_rounded, size: 18, color: WeretTokens.error),
              const SizedBox(width: _sm),
              Expanded(child: Text('driverRejectedBanner'.tr(), style: const TextStyle(fontSize: 12, height: 1.4, color: WeretTokens.error))),
            ],
          ),
        ),
      );
    }
    return DriverInfoBanner(text: 'driverPendingBanner'.tr());
  }
}

class _OnlineToggle extends StatelessWidget {
  final bool online;
  final VoidCallback onTap;
  const _OnlineToggle({required this.online, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return FilledButton(
      style: FilledButton.styleFrom(
        backgroundColor: online ? WeretTokens.error : WeretTokens.success,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
      ),
      onPressed: onTap,
      child: Text(online ? 'goOffline'.tr() : 'goOnline'.tr()),
    );
  }
}

class _StatsRow extends StatelessWidget {
  final bool online;
  final num earnings;
  final num? rating;
  const _StatsRow({required this.online, required this.earnings, required this.rating});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        DriverStatChip(
          label: 'driverCurrentStatus'.tr(),
          value: online ? 'driverOnlineSearching'.tr() : 'goOffline'.tr(),
          trailing: Container(
            width: _sm, height: _sm,
            decoration: BoxDecoration(color: online ? WeretTokens.success : WeretTokens.textSecondary, shape: BoxShape.circle),
          ),
        ),
        const SizedBox(width: _sm),
        DriverStatChip(label: 'driverSessionEarnings'.tr(), value: '\$${earnings.toStringAsFixed(2)}'),
        const SizedBox(width: _sm),
        DriverStatChip(
          label: 'driverRating'.tr(),
          value: '${rating ?? '—'}',
          trailing: const Icon(Icons.star, size: 16, color: WeretTokens.textMuted),
        ),
      ],
    );
  }
}

class _QuickActions extends StatelessWidget {
  const _QuickActions();

  @override
  Widget build(BuildContext context) {
    final style = OutlinedButton.styleFrom(
      foregroundColor: WeretTokens.textPrimary,
      side: const BorderSide(color: WeretTokens.borderSubtle),
    );
    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () => context.push('/driver/profile/bonuses'),
            icon: const Icon(Icons.emoji_events, size: 18),
            label: Text('bonuses'.tr()),
            style: style,
          ),
        ),
        const SizedBox(width: _sm),
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () => showModalBottomSheet(context: context, isScrollControlled: true, builder: (_) => const DriverBreakModeWidget()),
            icon: const Icon(Icons.free_breakfast, size: 18),
            label: Text('break'.tr()),
            style: style,
          ),
        ),
        const SizedBox(width: _sm),
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () => showModalBottomSheet(context: context, isScrollControlled: true, builder: (_) => const DriverHeatmapOverlay()),
            icon: const Icon(Icons.map, size: 18),
            label: Text('heatmap'.tr()),
            style: style,
          ),
        ),
      ],
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Active Ride Card
// ═══════════════════════════════════════════════════════════════════════

class _ActiveRideCard extends StatelessWidget {
  const _ActiveRideCard({
    required this.idx,
    required this.status,
    required this.fare,
    required this.passenger,
    required this.onChat,
    this.onArriving,
    this.onOnboard,
    this.onStart,
    this.onEnd,
    this.onCancel,
  });

  final int idx;
  final String status;
  final String fare;
  final String passenger;
  final VoidCallback onChat;
  final VoidCallback? onArriving;
  final VoidCallback? onOnboard;
  final VoidCallback? onStart;
  final VoidCallback? onEnd;
  final VoidCallback? onCancel;
  final VoidCallback? onJoinRequests;

  String get _statusLabel => const {
    'pending': 'Waiting for driver',
    'accepted': 'Driver accepted',
    'driver_arriving': 'Driver arriving',
    'passenger_onboard': 'Passenger onboard',
    'ongoing': 'In progress',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
  }[status] ?? status.replaceAll('_', ' ').capitalize();

  String get _actionLabel => const {
    'accepted': "I've arrived",
    'driver_arriving': 'Passenger onboard',
    'passenger_onboard': 'Start trip',
    'ongoing': 'End trip',
  }[status] ?? '';

  VoidCallback? get _action => const {
    'accepted': _ActionKey.arriving,
    'driver_arriving': _ActionKey.onboard,
    'passenger_onboard': _ActionKey.start,
    'ongoing': _ActionKey.end,
  }[status]?._get(this);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: _xl),
      child: SectionSurface(
        padding: const EdgeInsets.all(_xl),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    '${'driverRideSlot'.tr(namedArgs: {'n': '$idx'})} · $_statusLabel',
                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                  ),
                ),
              ],
            ),
            const SizedBox(height: _sm),
            Text('${'estimatedFare'.tr()}: $fare', style: const TextStyle(color: WeretTokens.textSecondary, fontSize: 13)),
            Text('${'passenger'.tr()}: $passenger', style: const TextStyle(fontSize: 13, color: WeretTokens.textMuted)),
            const SizedBox(height: _xl),

            OutlinedButton.icon(
              onPressed: onChat,
              icon: const Icon(Icons.chat_bubble_outline, size: 18),
              label: Text('rideChatTitle'.tr()),
            ),

            if (onJoinRequests != null) ...[
              const SizedBox(height: _sm),
              OutlinedButton.icon(
                onPressed: onJoinRequests,
                icon: const Icon(Icons.people_outline, size: 18),
                label: Text('Join Requests'),
                style: OutlinedButton.styleFrom(foregroundColor: WeretTokens.brand, side: const BorderSide(color: WeretTokens.brand)),
              ),
            ],

            if (_action != null && _actionLabel.isNotEmpty) ...[
              const SizedBox(height: _sm),
              CustomButton(title: _actionLabel, onPressed: _action),
            ],

            if (onCancel != null) ...[
              const SizedBox(height: _sm),
              OutlinedButton.icon(
                onPressed: onCancel,
                icon: const Icon(Icons.cancel_outlined, size: 18),
                label: Text('cancelRide'.tr()),
                style: OutlinedButton.styleFrom(foregroundColor: WeretTokens.error, side: const BorderSide(color: WeretTokens.error)),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// Helper to map status to callbacks without duplicating switch logic
class _ActionKey {
  static const arriving = _ActionKey('arriving');
  static const onboard = _ActionKey('onboard');
  static const start = _ActionKey('start');
  static const end = _ActionKey('end');
  final String key;
  const _ActionKey(this.key);
  VoidCallback? _get(_ActiveRideCard c) => switch (key) {
    'arriving' => c.onArriving,
    'onboard' => c.onOnboard,
    'start' => c.onStart,
    'end' => c.onEnd,
    _ => null,
  };
}

extension _StringCap on String {
  String capitalize() => isEmpty ? '' : '${this[0].toUpperCase()}${substring(1)}';
}

// ═══════════════════════════════════════════════════════════════════════
// Request Card
// ═══════════════════════════════════════════════════════════════════════

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
    final pu = ride['pickupLocation'];
    final pickup = pu is Map ? '${pu['address'] ?? _coordFallback(pu)}' : '—';
    final de = ride['destinationLocation'];
    final dropoff = de is Map ? '${de['address'] ?? _coordFallback(de)}' : '—';
    final enabled = online && canTakeMore;

    return PressableScale(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: _xl),
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: WeretTokens.surface,
          borderRadius: BorderRadius.circular(WeretTokens.cardRadius),
          border: Border.all(
            color: premium ? WeretTokens.brand : WeretTokens.border.withValues(alpha: 0.7),
            width: premium ? 1.5 : 1.0,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (premium)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: _xl, vertical: _sm),
                color: WeretTokens.neutralSoft,
                child: Text('driverTopRatedUser'.tr(), style: TextStyle(color: WeretTokens.onNeutral, fontWeight: FontWeight.w800, fontSize: 11)),
              ),

            Padding(
              padding: const EdgeInsets.all(_xl),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 22,
                        backgroundColor: WeretTokens.inputFill,
                        backgroundImage: passengerImageUrl != null ? NetworkImage(passengerImageUrl!) : null,
                        child: passengerImageUrl == null ? const Icon(Icons.person, color: WeretTokens.textMuted) : null,
                      ),
                      const SizedBox(width: _md),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(passengerName, style: const TextStyle(fontWeight: FontWeight.w800)),
                            const SizedBox(height: 2),
                            Text(passengerSubtitle.isNotEmpty ? passengerSubtitle : '—', style: const TextStyle(fontSize: 12, color: WeretTokens.textSecondary)),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: _lg, vertical: _sm),
                        decoration: BoxDecoration(
                          color: premium ? WeretTokens.brandSurface : WeretTokens.inputFill,
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text('\$$fare', style: TextStyle(fontWeight: FontWeight.w800, color: premium ? WeretTokens.brand : WeretTokens.textPrimary)),
                      ),
                    ],
                  ),
                  const SizedBox(height: _xl),
                  _routeRow(Icons.place_outlined, 'pickup'.tr(), pickup),
                  const SizedBox(height: _md),
                  _routeRow(Icons.flag_outlined, 'destination'.tr(), dropoff),
                  const SizedBox(height: _xl),

                  if (awaitingConfirm && onDecline != null)
                    Row(
                      children: [
                        Expanded(child: OutlinedButton(onPressed: onDecline, child: Text('decline'.tr()))),
                        const SizedBox(width: _sm),
                        Expanded(child: FilledButton(onPressed: enabled ? onAccept : null, child: Text('accept'.tr()))),
                      ],
                    )
                  else
                    FilledButton(
                      style: FilledButton.styleFrom(
                        backgroundColor: premium ? WeretTokens.premium : WeretTokens.brand,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      onPressed: enabled ? onAccept : null,
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
        const SizedBox(width: _sm),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label.toUpperCase(), style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: WeretTokens.textSecondary)),
              Text(value, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            ],
          ),
        ),
      ],
    );
  }

  String _coordFallback(Map<dynamic, dynamic> loc) {
    final lat = loc['lat'] ?? loc['latitude'];
    final lng = loc['lng'] ?? loc['longitude'];
    if (lat != null && lng != null) return '${lat.toStringAsFixed(4)}, ${lng.toStringAsFixed(4)}';
    return '—';
  }
}
