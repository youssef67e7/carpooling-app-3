import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/ride_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_styles.dart';
import '../../core/utils/geo_helpers.dart';
import '../../core/utils/map_polyline_model.dart';
import '../../core/utils/map_scene_builder.dart';
import '../../shared/widgets/passenger_map_picker_screen.dart';
import '../../shared/widgets/active_ride_panel.dart';
import '../../shared/widgets/driver_offer_banner.dart';
import '../../shared/widgets/nearby_ride_card.dart';
import '../../shared/widgets/rate_driver_modal.dart';
import '../../shared/widgets/service_type_gallery.dart';
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
  final _pickupCtrl = TextEditingController();
  final _destCtrl = TextEditingController();

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
    _pickupCtrl.dispose();
    _destCtrl.dispose();
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
        'pickupLocation': {
          'lat': _pickup!.latitude,
          'lng': _pickup!.longitude,
          if (_pickupCtrl.text.isNotEmpty) 'address': _pickupCtrl.text,
        },
        'destinationLocation': {
          'lat': _destination!.latitude,
          'lng': _destination!.longitude,
          if (_destCtrl.text.isNotEmpty) 'address': _destCtrl.text,
        },
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('rideRequestSentTitle'.tr())));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    } finally {
      if (mounted) setState(() => _creating = false);
    }
  }

  void _onPickupTap() {
    _openMapPicker(MapPickerMode.pickup);
  }

  void _onDestinationTap() {
    _openMapPicker(MapPickerMode.destination);
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
    final hasOffer = active != null && DriverOfferBanner.hasPendingOffer(active);
    final nearbyPoints = nearbyDriverPoints(ride.nearbyDrivers);

    return Scaffold(
      backgroundColor: AppColors.secondary,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 16),
              Row(
                children: [
                  const WeretLogo.wordmark(fontSize: 20),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.settings_outlined, color: AppColors.textSecondary, size: 24),
                    onPressed: () => context.go('/passenger/settings'),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              Text('Going the same way?', style: AppStyles.headlineMedium),
              const SizedBox(height: 4),
              Text('choose your trip.', style: AppStyles.bodyRegular),
              const SizedBox(height: 20),
              Text('YOUR LOCATION', style: AppStyles.sectionLabel),
              const SizedBox(height: 6),
              GestureDetector(
                onTap: _onPickupTap,
                child: AbsorbPointer(
                  child: Container(
                    height: 50,
                    decoration: BoxDecoration(
                      color: AppColors.inputBackground,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.borderLight),
                    ),
                    child: TextField(
                      controller: _pickupCtrl,
                      decoration: InputDecoration(
                        hintText: 'Current location',
                        hintStyle: TextStyle(color: AppColors.textMuted, fontSize: 14),
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text('WHERE TO?', style: AppStyles.sectionLabel),
              const SizedBox(height: 6),
              GestureDetector(
                onTap: _onDestinationTap,
                child: AbsorbPointer(
                  child: Container(
                    height: 50,
                    decoration: BoxDecoration(
                      color: AppColors.inputBackground,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.borderLight),
                    ),
                    child: TextField(
                      controller: _destCtrl,
                      decoration: InputDecoration(
                        hintText: 'Destination',
                        hintStyle: TextStyle(color: AppColors.textMuted, fontSize: 14),
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              if (active == null) ...[
                ServiceTypeGallery(
                  selected: _vehicleType,
                  onSelected: (t) {
                    setState(() => _vehicleType = t);
                    _refreshNearby();
                  },
                ),
                const SizedBox(height: 16),
              ],
              SizedBox(
                width: double.infinity,
                height: 50,
                child: FilledButton(
                  onPressed: _canSearch ? _onPickupTap : null,
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                  ),
                  child: Text(active == null ? 'searchDriverCta'.tr() : 'edit'.tr()),
                ),
              ),
              const SizedBox(height: 16),
              if (active != null) ...[
                ActiveRidePanel(ride: active),
                if (hasOffer)
                  DriverOfferBanner(
                    ride: active,
                    onAccept: () async {
                      setState(() => _offerLoading = true);
                      try {
                        await ref.read(rideProvider.notifier).respondProposal('${active['_id']}', true);
                      } catch (e) {
                        if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
                      } finally {
                        if (mounted) setState(() => _offerLoading = false);
                      }
                    },
                    onReject: () async {
                      setState(() => _offerLoading = true);
                      try {
                        await ref.read(rideProvider.notifier).respondProposal('${active['_id']}', false);
                      } catch (e) {
                        if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
                      } finally {
                        if (mounted) setState(() => _offerLoading = false);
                      }
                    },
                    loading: _offerLoading,
                  ),
                const SizedBox(height: 8),
              ],
              ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: WeretRideMap(
                  center: _pickup ?? const LatLng(24.7136, 46.6753),
                  controller: _map,
                  height: 170,
                  pickup: _pickup,
                  destination: _destination,
                  routePoints: _previewPoints,
                  nearbyDrivers: active == null ? nearbyPoints : const [],
                  assignedDriver: active != null ? driverLatLngFromRide(active) : null,
                  scene: active != null
                      ? buildPassengerMapScene(
                          activeRide: active,
                          pickup: pickupFromRide(active),
                          destination: destinationFromRide(active),
                          driver: driverLatLngFromRide(active),
                        )
                      : null,
                  autoFit: _previewPoints.length >= 2,
                  interactive: true,
                ),
              ),
              if (active == null && _canSearch) ...[
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 55,
                  child: FilledButton(
                    onPressed: _creating ? null : _book,
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                    ),
                    child: _creating
                        ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : Text('requestRide'.tr()),
                  ),
                ),
              ],
              if (active == null && _canSearch) ...[
                const SizedBox(height: 28),
                const Text('Trips Nearby:', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: Colors.black)),
                const SizedBox(height: 16),
                if (ride.nearbyDrivers.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    child: Text('nearbyEmpty'.tr(), style: TextStyle(color: AppColors.textMuted, fontSize: 14)),
                  )
                else
                  ...ride.nearbyDrivers.map((d) => NearbyRideCard(
                        driverName: '${d['name'] ?? d['driverName'] ?? ''}',
                        rating: (d['rating'] as num?)?.toDouble() ?? 0,
                        rideCount: (d['rideCount'] as num?)?.toInt() ?? 0,
                        price: (d['price'] as num?)?.toDouble() ?? 0,
                        departureTime: '${d['departureTime'] ?? ''}',
                        arrivalTime: '${d['arrivalTime'] ?? ''}',
                        fromLocation: '${d['fromLocation'] ?? d['pickupAddress'] ?? ''}',
                        toLocation: '${d['toLocation'] ?? d['dropoffAddress'] ?? ''}',
                        seatsLeft: (d['seatsLeft'] as num?)?.toInt() ?? 1,
                      )),
              ],
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
