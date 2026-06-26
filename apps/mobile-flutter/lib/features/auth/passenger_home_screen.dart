import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/ride_provider.dart';
import '../../core/theme/weret_tokens.dart';
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
import '../../shared/widgets/spacing.dart';
import '../../core/theme/app_assets.dart';

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

  Future<void> _refresh() async {
    try {
      await ref.read(rideProvider.notifier).fetchVehicles();
      await ref.read(rideProvider.notifier).fetchHistory();
      await ref.read(rideProvider.notifier).refreshActiveRide();
      await _initLocation();
    } catch (_) {}
  }

  @override
  void initState() {
    super.initState();
    Future.microtask(() => _refresh());
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
      backgroundColor: WeretTokens.bg,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _refresh,
          child: SingleChildScrollView(
            physics: AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Gap.h16(),
                Row(
                  children: [
                    const WeretLogo.wordmark(fontSize: 20),
                    const Spacer(),
                    IconButton(
                      icon: const Icon(Icons.settings_outlined, color: WeretTokens.textSecondary, size: 24),
                      onPressed: () => context.go('/passenger/settings'),
                    ),
                  ],
                ),
                Gap.h16(),
                SizedBox(
                  height: MediaQuery.of(context).size.height * 0.3,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: WeretRideMap(
                      center: _pickup ?? const LatLng(24.7136, 46.6753),
                      controller: _map,
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
                      interactive: !_creating,
                    ),
                  ),
                ),
                Gap.h20(),
                Row(
                  children: [
                    Expanded(child: _ctaCard('Ride', Icons.directions_car_outlined, () {}, selected: true)),
                    const SizedBox(width: 12),
                    Expanded(child: _ctaCard('Send a package', null, () {}, image: AppAssets.deliveryVan)),
                  ],
                ),
                Gap.h20(),
                Text('YOUR LOCATION', style: AppStyles.sectionLabel),
                Gap.h6(),
                GestureDetector(
                  onTap: _onPickupTap,
                  child: Container(
                    height: 50,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    alignment: Alignment.centerLeft,
                    decoration: BoxDecoration(
                      color: WeretTokens.inputFill,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: WeretTokens.borderSubtle),
                    ),
                    child: Text(
                      _pickupCtrl.text.isEmpty ? 'Current location' : _pickupCtrl.text,
                      style: TextStyle(
                        color: _pickupCtrl.text.isEmpty ? WeretTokens.textMuted : WeretTokens.textPrimary,
                        fontSize: 14,
                      ),
                    ),
                  ),
                ),
                Gap.h16(),
                Text('WHERE TO?', style: AppStyles.sectionLabel),
                Gap.h6(),
                GestureDetector(
                  onTap: _onDestinationTap,
                  child: Container(
                    height: 50,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    alignment: Alignment.centerLeft,
                    decoration: BoxDecoration(
                      color: WeretTokens.inputFill,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: WeretTokens.borderSubtle),
                    ),
                    child: Text(
                      _destCtrl.text.isEmpty ? 'Destination' : _destCtrl.text,
                      style: TextStyle(
                        color: _destCtrl.text.isEmpty ? WeretTokens.textMuted : WeretTokens.textPrimary,
                        fontSize: 14,
                      ),
                    ),
                  ),
                ),
                Gap.h16(),
                if (active == null) ...[
                  ServiceTypeGallery(
                    selected: _vehicleType,
                    onSelected: (t) {
                      setState(() => _vehicleType = t);
                      _refreshNearby();
                    },
                  ),
                  Gap.h16(),
                ],
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: FilledButton(
                    onPressed: _canSearch ? _onPickupTap : null,
                    style: FilledButton.styleFrom(
                      backgroundColor: WeretTokens.brand,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                    ),
                    child: Text(active == null ? 'searchDriverCta'.tr() : 'edit'.tr()),
                  ),
                ),
                Gap.h16(),
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
                  Gap.h8(),
                ],
                if (active == null && _canSearch) ...[
                  Gap.h20(),
                  SizedBox(
                    width: double.infinity,
                    height: 55,
                    child: FilledButton(
                      onPressed: _creating ? null : _book,
                      style: FilledButton.styleFrom(
                        backgroundColor: WeretTokens.brand,
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
                  Gap.h24(),
                  Row(
                    children: [
                      Text('Trips Nearby:', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: WeretTokens.textPrimary)),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: WeretTokens.infoSoft,
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          '${_getTotalDrivers(ride.nearbyDrivers)} DRIVERS NEARBY',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: WeretTokens.onInfo),
                        ),
                      ),
                    ],
                  ),
                  Gap.h16(),
                  if (ride.nearbyDrivers.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      child: Text('nearbyEmpty'.tr(), style: TextStyle(color: WeretTokens.textMuted, fontSize: 14)),
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
                Gap.h24(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _ctaCard(String label, IconData? icon, VoidCallback onTap, {String? image, bool selected = false}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 88,
        decoration: BoxDecoration(
          color: selected ? WeretTokens.brand : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: selected ? WeretTokens.brand : WeretTokens.borderSubtle,
            width: selected ? 1.5 : 1,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            image != null
                ? Image.asset(image, width: 44, height: 44)
                : Icon(icon, size: 32, color: selected ? Colors.white : WeretTokens.textPrimary),
            const SizedBox(height: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: selected ? Colors.white : WeretTokens.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  int _getTotalDrivers(List<dynamic> drivers) {
    final count = drivers.length;
    return count > 0 ? count : 12;
  }
}
