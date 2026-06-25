import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/ride_provider.dart';
import '../../core/theme/weret_tokens.dart';
import '../../core/utils/geo_helpers.dart';
import '../../core/utils/map_polyline_model.dart';
import '../../core/utils/map_scene_builder.dart';
import '../../core/utils/trip_fare.dart';
import '../../shared/widgets/custom_button.dart';
import '../../shared/widgets/passenger_map_picker_screen.dart';
import '../../core/utils/logout_action.dart';
import '../../shared/widgets/active_ride_panel.dart';
import '../../shared/widgets/driver_offer_banner.dart';
import '../../shared/widgets/rate_driver_modal.dart';
import '../../shared/widgets/service_type_gallery.dart';
import '../../shared/widgets/weret_ambient_background.dart';
import '../../shared/widgets/weret_logo.dart';
import '../../shared/widgets/weret_ride_map.dart';

class PassengerHomeScreen extends ConsumerStatefulWidget {
  const PassengerHomeScreen({super.key});
  @override
  ConsumerState<PassengerHomeScreen> createState() => _PassengerHomeScreenState();
}

class _PassengerHomeScreenState extends ConsumerState<PassengerHomeScreen> {
  LatLng? _pickup;
  LatLng? _destination;
  String _vehicleType = 'delivery';
  bool _creating = false;
  final _map = MapController();
  String? _ratingPromptRideId;
  bool _offerLoading = false;
  Map<String, dynamic>? _routePreview;
  List<LatLng> _previewPoints = const [];

  bool get _canSearch => _pickup != null && _destination != null;

  @override
  void initState() {
    super.initState();
    Future.microtask(() async {
      try {
        await ref.read(rideProvider.notifier).fetchVehicles();
        await ref.read(rideProvider.notifier).fetchHistory();
        await ref.read(rideProvider.notifier).refreshActiveRide();
        await _initLocation();
      } catch (_) {}
    });
  }

  @override
  void dispose() {
    super.dispose();
  }

  Future<void> _initLocation() async {
    var perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) perm = await Geolocator.requestPermission();
    if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) return;
    final pos = await Geolocator.getCurrentPosition();
    if (!mounted) return;
    setState(() => _pickup = LatLng(pos.latitude, pos.longitude));
    await ref.read(rideProvider.notifier).updatePassengerLocation(pos.latitude, pos.longitude);
    await _refreshNearby();
    await _refreshRoutePreview();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_pickup != null) _map.move(_pickup!, 14);
    });
  }

  Future<void> _refreshNearby() async {
    try {
      final p = _pickup;
      if (p != null) {
        await ref.read(rideProvider.notifier).fetchNearbyDrivers(_vehicleType, lat: p.latitude, lng: p.longitude);
      } else {
        await ref.read(rideProvider.notifier).fetchNearbyDrivers(_vehicleType);
      }
    } catch (e) {
      debugPrint('Nearby drivers fetch failed: $e');
    }
  }

  Future<void> _refreshRoutePreview() async {
    if (_pickup == null || _destination == null) {
      if (_previewPoints.isNotEmpty || _routePreview != null) {
        setState(() {
          _previewPoints = const [];
          _routePreview = null;
        });
      }
      return;
    }
    Map<String, dynamic>? preview;
    try {
      preview = await ref.read(rideProvider.notifier).fetchRoutePreview(
            _pickup!.latitude,
            _pickup!.longitude,
            _destination!.latitude,
            _destination!.longitude,
          );
    } catch (e) {
      debugPrint('Route preview fetch failed: $e');
    }
    if (!mounted) return;
    setState(() {
      _routePreview = preview;
      _previewPoints = routePathFromPreview(preview);
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final scene = buildPassengerMapScene(
        pickup: _pickup,
        destination: _destination,
        previewRoute: _previewPoints,
      );
      fitMapToPoints(_map, scene.fitPoints);
    });
  }

  Future<void> _openMapPicker(MapPickerMode mode) async {
    final center = _pickup ?? _destination ?? const LatLng(24.7136, 46.6753);
    final result = await PassengerMapPickerScreen.open(
      context,
      center: center,
      mode: mode,
      pickup: _pickup,
      destination: _destination,
    );
    if (result == null) return;
    setState(() {
      _pickup = result['pickup'] ?? _pickup;
      _destination = result['destination'] ?? _destination;
    });
    try {
      await _refreshRoutePreview();
      await _refreshNearby();
    } catch (e) {
      debugPrint('Picker post-update fetch failed: $e');
    }
  }

  void _fitMapScene(WeretMapScene scene) {
    fitMapToPoints(_map, scene.fitPoints);
  }

  Future<void> _book() async {
    if (!_canSearch) return;
    setState(() => _creating = true);
    try {
      await ref.read(rideProvider.notifier).createRide({
        'vehicleType': _vehicleType,
        'pickupLocation': {'lat': _pickup!.latitude, 'lng': _pickup!.longitude},
        'destinationLocation': {'lat': _destination!.latitude, 'lng': _destination!.longitude},
      });
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('rideRequestSentTitle'.tr())));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    } finally {
      if (mounted) setState(() => _creating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final ride = ref.watch(rideProvider);
    ref.listen<RideState>(rideProvider, (prev, next) {
      final active = next.activeRide;
      if (active == null) return;
      final id = '${active['_id']}';
      final status = '${active['status']}';
      if (status == 'completed' && active['passengerRating'] == null && _ratingPromptRideId != id) {
        _ratingPromptRideId = id;
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!mounted) return;
          showRateDriverModal(context, ref, ride: active);
        });
      }
      if (prev?.activeRide == null) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!mounted) return;
          final scene = buildPassengerMapScene(
            activeRide: active,
            pickup: pickupFromRide(active),
            destination: destinationFromRide(active),
            driver: driverLatLngFromRide(active),
          );
          _fitMapScene(scene);
        });
      }
    });
    final active = ride.activeRide;
    final pickup = _pickup ?? (active != null ? pickupFromRide(active) : null);
    final destination = _destination ?? (active != null ? destinationFromRide(active) : null);
    final center = pickup ?? destination ?? const LatLng(24.7136, 46.6753);
    final drivers = ride.nearbyDrivers.length;
    final driverOnMap = active != null ? driverLatLngFromRide(active) : null;
    final mapScene = buildPassengerMapScene(
      activeRide: active,
      pickup: pickup,
      destination: destination,
      driver: driverOnMap,
      nearbyDrivers: nearbyDriverPoints(ride.nearbyDrivers),
      previewRoute: active == null ? _previewPoints : const [],
    );
    final fareHint = _fareHint(ride, pickup, destination);

    return Scaffold(
      backgroundColor: WeretTokens.bg,
      appBar: AppBar(
        toolbarHeight: kWeretAppBarLogoHeight,
        title: const WeretLogo.appBar(),
        centerTitle: true,
        actions: [
          IconButton(icon: const Icon(Icons.history), onPressed: () => context.go('/passenger/history')),
          IconButton(icon: const Icon(Icons.settings_outlined), onPressed: () => context.go('/passenger/settings')),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => performLogout(ref, context),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: WeretAmbientBackground(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            WeretRideMapWithExpand(
              center: center,
              controller: _map,
              height: active != null ? 260 : 200,
              scene: mapScene,
              expandLabel: 'passengerMapCompactTap'.tr(),
              onExpand: () => _openMapPicker(destination == null && pickup != null ? MapPickerMode.destination : MapPickerMode.pickup),
              onRecenter: _initLocation,
              onFitRoute: () => _fitMapScene(mapScene),
            ),
            if (_routePreview != null && active == null && _canSearch) ...[
              const SizedBox(height: 8),
              Text(
                'mapPreviewDistance'.tr(namedArgs: {
                  'km': '${(_routePreview!['distanceKm'] ?? '—')}',
                  'min': '${(_routePreview!['etaMinutes'] ?? '—')}',
                }),
                textAlign: TextAlign.center,
                style: const TextStyle(color: WeretTokens.textSecondary, fontSize: 12, fontWeight: FontWeight.w600),
              ),
            ],
            const SizedBox(height: 18),
            Text('passengerWeretHeadline'.tr(), style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 28)),
            const SizedBox(height: 6),
            Text('passengerWeretSub'.tr(), style: const TextStyle(color: WeretTokens.textSecondary, height: 1.4)),
            const SizedBox(height: 12),
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: WeretTokens.brand,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(width: 8, height: 8, decoration: const BoxDecoration(color: WeretTokens.success, shape: BoxShape.circle)),
                    const SizedBox(width: 8),
                    Text(
                      'passengerDriversNearbyPill'.tr(namedArgs: {'count': '$drivers'}),
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 12),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 18),
            ServiceTypeGallery(
              selected: _vehicleType,
              onSelected: (v) async {
                setState(() => _vehicleType = v);
                try {
                  await _refreshNearby();
                } catch (e) {
                  debugPrint('Vehicle type change nearby fetch failed: $e');
                }
              },
            ),
            const SizedBox(height: 18),
            if (active != null && DriverOfferBanner.hasPendingOffer(active))
              DriverOfferBanner(
                ride: active,
                loading: _offerLoading,
                onAccept: () async {
                  setState(() => _offerLoading = true);
                  try {
                    await ref.read(rideProvider.notifier).respondProposal('${active['_id']}', true);
                  } finally {
                    if (mounted) setState(() => _offerLoading = false);
                  }
                },
                onReject: () async {
                  setState(() => _offerLoading = true);
                  try {
                    await ref.read(rideProvider.notifier).respondProposal('${active['_id']}', false);
                  } finally {
                    if (mounted) setState(() => _offerLoading = false);
                  }
                },
              ),
            if (ride.activeRide != null) ActiveRidePanel(ride: ride.activeRide!),
            if (active == null)
              CustomButton(
                title: 'searchDriverCta'.tr(),
                loading: _creating,
                disabled: !_canSearch,
                onPressed: _canSearch ? _book : null,
              ),
            const SizedBox(height: 8),
            Text(
              fareHint,
              textAlign: TextAlign.center,
              style: const TextStyle(color: WeretTokens.textSecondary, fontSize: 12, height: 1.4),
            ),
          ],
        ),
      ),
    );
  }

  String _fareHint(RideState ride, LatLng? pickup, LatLng? destination) {
    if (pickup == null || destination == null) return 'requestRideHintPickup'.tr();
    final km = _routePreview?['distanceKm'] as num? ?? haversineKm(pickup.latitude, pickup.longitude, destination.latitude, destination.longitude);
    Map<String, dynamic>? vehicle;
    for (final v in ride.vehicles) {
      if (v is Map && '${v['typeKey'] ?? v['type']}' == _vehicleType) {
        vehicle = Map<String, dynamic>.from(v);
        break;
      }
    }
    final amount = vehicle != null ? fareFromVehicle(vehicle, km.toDouble()).toStringAsFixed(0) : '—';
    return 'estimatedTripPriceWithKm'.tr(namedArgs: {
      'vehicle': 'vehicleType_$_vehicleType'.tr(),
      'amount': amount,
      'km': km.toStringAsFixed(1),
    });
  }
}
