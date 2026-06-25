import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/providers/ride_provider.dart';
import '../../core/theme/weret_tokens.dart';
import '../../core/utils/geo_helpers.dart';
import '../../core/utils/map_scene_builder.dart';
import '../../shared/widgets/custom_button.dart';
import '../../shared/widgets/weret_ride_map.dart';
import 'driver_passenger_helpers.dart';

class DriverRequestDetailScreen extends ConsumerStatefulWidget {
  const DriverRequestDetailScreen({super.key, required this.rideId, this.initialRide});
  final String rideId;
  final Map<String, dynamic>? initialRide;

  @override
  ConsumerState<DriverRequestDetailScreen> createState() => _DriverRequestDetailScreenState();
}

class _DriverRequestDetailScreenState extends ConsumerState<DriverRequestDetailScreen> {
  Map<String, dynamic>? _ride;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _ride = widget.initialRide;
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final api = await ref.read(apiClientProvider.future);
      final data = await api.getJson(ApiEndpoints.ride(widget.rideId));
      if (mounted) {
        setState(() {
          _ride = Map<String, dynamic>.from((data['ride'] ?? data) as Map);
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading && _ride == null) {
      return Scaffold(appBar: AppBar(title: Text('driverNewRequest'.tr())), body: const Center(child: CircularProgressIndicator()));
    }
    final ride = _ride ?? {};
    final pu = pickupFromRide(ride);
    final de = destinationFromRide(ride);
    final fare = ride['estimatedFare'] ?? ride['preassignedFare'] ?? ride['fare'] ?? '—';
    final surge = ride['surgeAmount'] ?? ride['surge'];
    final distance = ride['distanceMiles'] ?? ride['distance'] ?? '—';
    final name = passengerNameFromRide(ride);
    final subtitle = passengerStatsLabel(ride);

    return Scaffold(
      appBar: AppBar(title: Text('driverNewRequest'.tr())),
      body: Column(
        children: [
          if (pu != null)
            WeretRideMap(
              center: pu,
              height: 220,
              scene: buildPassengerMapScene(pickup: pu, destination: de),
              interactive: true,
              autoFit: true,
            ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: WeretTokens.surface,
                    borderRadius: BorderRadius.circular(WeretTokens.cardRadius),
                    border: Border.all(color: WeretTokens.border.withValues(alpha: 0.6)),
                  ),
                  child: Row(
                    children: [
                      CircleAvatar(radius: 28, child: Text(name.isNotEmpty ? name[0].toUpperCase() : '?')),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(name, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                            if (subtitle.isNotEmpty)
                              Text(subtitle, style: const TextStyle(color: WeretTokens.textSecondary, fontSize: 12)),
                          ],
                        ),
                      ),
                      IconButton(onPressed: () => context.push('/ride-chat/${ride['_id'] ?? widget.rideId}'), icon: const Icon(Icons.chat_bubble_outline)),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(child: _metric('driverDistance'.tr(), '$distance ${'miles'.tr()}')),
                    Expanded(child: _metric('estimatedFare'.tr(), '\$$fare', surge: surge != null ? '\$$surge' : null)),
                  ],
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: WeretTokens.surface,
                    borderRadius: BorderRadius.circular(WeretTokens.cardRadius),
                    border: Border.all(color: WeretTokens.border.withValues(alpha: 0.6)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _loc('pickup'.tr(), _address(ride, 'pickupLocation'), 'driverPickupEta'.tr()),
                      const SizedBox(height: 16),
                      _loc('destination'.tr(), _address(ride, 'destinationLocation'), 'driverTripEta'.tr()),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      ref.read(rideProvider.notifier).driverConfirmBooking('${ride['_id'] ?? widget.rideId}', false);
                      context.pop();
                    },
                    icon: const Icon(Icons.close),
                    label: Text('decline'.tr()),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: CustomButton(
                    title: 'driverAcceptRequest'.tr(),
                    onPressed: () async {
                      await ref.read(rideProvider.notifier).acceptRide('${ride['_id'] ?? widget.rideId}');
                      if (context.mounted) context.pop();
                    },
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _address(Map<String, dynamic> ride, String key) {
    final loc = ride[key];
    if (loc is Map) return '${loc['address'] ?? '—'}';
    return '—';
  }

  Widget _metric(String label, String value, {String? surge}) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 4),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: WeretTokens.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: WeretTokens.border.withValues(alpha: 0.5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label.toUpperCase(), style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: WeretTokens.textSecondary)),
          const SizedBox(height: 6),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18)),
          if (surge != null) Text('driverIncludesSurge'.tr(namedArgs: {'amount': surge}), style: const TextStyle(color: WeretTokens.textSecondary, fontSize: 11)),
        ],
      ),
    );
  }

  Widget _loc(String label, String address, String sub) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Icon(Icons.place_outlined, size: 18),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label.toUpperCase(), style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: WeretTokens.textSecondary)),
              Text(address, style: const TextStyle(fontWeight: FontWeight.w700)),
              Text(sub, style: const TextStyle(fontSize: 12, color: WeretTokens.textSecondary)),
            ],
          ),
        ),
      ],
    );
  }
}
