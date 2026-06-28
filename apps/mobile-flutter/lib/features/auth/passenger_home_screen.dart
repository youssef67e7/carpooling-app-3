// ignore_for_file: unused_element

import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers/ride_provider.dart';
import '../../core/services/passenger_location_tracker.dart';
import '../../core/theme/weret_tokens.dart';
import '../../core/theme/app_styles.dart';
import '../../core/theme/app_assets.dart';
import '../../core/utils/geo_helpers.dart';
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
import '../../shared/widgets/ui/pressable_scale.dart';
import '../../shared/widgets/ui/form_error_callout.dart';
import '../../shared/widgets/custom_button.dart';

// ── Spacing ──────────────────────────────────────────────────────────
const _xs = 8.0;
const _sm = 12.0;
const _fieldGap = 14.0;
const _md = 16.0;
const _lg = 24.0;
const _xl = 32.0;
const _xxl = 60.0;


// ── Map config ───────────────────────────────────────────────────────
const _mapHeightFraction = 0.30;
const _defaultCenter = LatLng(24.7136, 46.6753);
const _defaultZoom = 14.0;

class PassengerHomeScreen extends ConsumerStatefulWidget {
  const PassengerHomeScreen({super.key});

  @override
  ConsumerState<PassengerHomeScreen> createState() =>
      _PassengerHomeScreenState();
}

class _PassengerHomeScreenState extends ConsumerState<PassengerHomeScreen> {
  // ── Map ───────────────────────────────────────────────────────────
  final _map = MapController();

  // ── Location ──────────────────────────────────────────────────────
  LatLng? _pickup;
  LatLng? _destination;

  // ── Text display ──────────────────────────────────────────────────
  final _pickupCtrl = TextEditingController();
  final _destCtrl = TextEditingController();

  // ── Ride config ───────────────────────────────────────────────────
  String _vehicleType = 'delivery';
  int _passengerCount = 1;

  // ── Route preview ─────────────────────────────────────────────────
  Map<String, dynamic>? _routePreview;
  List<LatLng> _previewPoints = const [];

  // ── Loading ───────────────────────────────────────────────────────
  bool _creating = false;
  bool _offerLoading = false;

  // ── Rating dedup ──────────────────────────────────────────────────
  String? _ratingPromptRideId;

  // ── Error ─────────────────────────────────────────────────────────
  String? _localError;
  bool _errorDismissed = false;

  // ── Computed ──────────────────────────────────────────────────────
  bool get _canBook => _pickup != null && _destination != null;

  String? _displayError(String? providerError) {
    if (_errorDismissed) return null;
    return _localError ?? providerError;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────
  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      _refresh();
      ref.read(passengerLocationTrackerProvider).start();
    });
  }

  @override
  void dispose() {
    _pickupCtrl.dispose();
    _destCtrl.dispose();
    _map.dispose();
    ref.read(passengerLocationTrackerProvider).stop();
    super.dispose();
  }

  // ── Error helpers ─────────────────────────────────────────────────
  void _setError(String? e) {
    if (e == null || e.isEmpty) return;
    HapticFeedback.heavyImpact();
    setState(() { _localError = e; _errorDismissed = false; });
  }

  void _dismissError() => setState(() => _errorDismissed = true);

  // ── Data fetching ─────────────────────────────────────────────────
  Future<void> _refresh() async {
    try {
      await ref.read(rideProvider.notifier).fetchVehicles();
      await ref.read(rideProvider.notifier).fetchHistory();
      await ref.read(rideProvider.notifier).refreshActiveRide();
      await _initLocation();
    } catch (e) {
      debugPrint('Initial refresh failed: $e');
    }
  }

  Future<void> _initLocation() async {
    var perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) {
      perm = await Geolocator.requestPermission();
    }
    if (perm == LocationPermission.denied ||
        perm == LocationPermission.deniedForever) return;

    final pos = await Geolocator.getCurrentPosition();
    if (!mounted) return;
    setState(() => _pickup = LatLng(pos.latitude, pos.longitude));
    await _refreshNearby();
    await _refreshRoutePreview();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_pickup != null) _map.move(_pickup!, _defaultZoom);
    });
  }

  Future<void> _refreshNearby() async {
    final p = _pickup;
    try {
      if (p != null) {
        await ref.read(rideProvider.notifier).fetchNearbyDrivers(
              _vehicleType,
              lat: p.latitude,
              lng: p.longitude,
            );
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

  // ── Map picker ────────────────────────────────────────────────────
  Future<void> _openMapPicker(MapPickerMode mode) async {
    HapticFeedback.selectionClick();
    final center = _pickup ?? _destination ?? _defaultCenter;
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
      debugPrint('Picker post-update failed: $e');
    }
  }

  // ── Booking ───────────────────────────────────────────────────────
  Future<void> _book() async {
    if (!_canBook || _creating) return;
    HapticFeedback.mediumImpact();
    setState(() => _creating = true);
    _dismissError();
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
        'passengerCount': _passengerCount,
      });
      if (!mounted) return;
      HapticFeedback.lightImpact();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('rideRequestSentTitle'.tr())),
      );
    } catch (e) {
      if (mounted) _setError('$e');
    } finally {
      if (mounted) setState(() => _creating = false);
    }
  }

  // ── Offer response (deduplicated) ─────────────────────────────────
  Future<void> _respondToOffer(String rideId, bool accept) async {
    if (_offerLoading) return;
    HapticFeedback.selectionClick();
    setState(() => _offerLoading = true);
    try {
      await ref.read(rideProvider.notifier).respondProposal(rideId, accept);
    } catch (e) {
      if (mounted) _setError('$e');
    } finally {
      if (mounted) setState(() => _offerLoading = false);
    }
  }

  // ── Ride state listener ───────────────────────────────────────────
  void _handleRideStateChange(RideState? prev, RideState next) {
    final active = next.activeRide;
    if (active == null) return;

    final id = '${active['_id']}';
    final status = '${active['status']}';

    if (status == 'completed' &&
        active['passengerRating'] == null &&
        _ratingPromptRideId != id) {
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
        fitMapToPoints(_map, scene.fitPoints);
      });
    }
  }

  // ── Next missing field ────────────────────────────────────────────
  MapPickerMode get _nextMissingField =>
      _pickup == null ? MapPickerMode.pickup : MapPickerMode.destination;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BUILD
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  @override
  Widget build(BuildContext context) {
    final ride = ref.watch(rideProvider);
    final active = ride.activeRide;
    final hasOffer =
        active != null && DriverOfferBanner.hasPendingOffer(active);
    final nearbyPoints = nearbyDriverPoints(ride.nearbyDrivers);
    final error = _displayError(ride.error);

    ref.listen<RideState>(rideProvider, _handleRideStateChange);

    return Scaffold(
      backgroundColor: WeretTokens.bg,
      floatingActionButton: active != null
          ? FloatingActionButton.extended(
              backgroundColor: WeretTokens.error,
              foregroundColor: WeretTokens.surface,
              icon: const Icon(Icons.sos),
              label: const Text(
                'SOS',
                style: TextStyle(fontWeight: FontWeight.w700),
              ),
              onPressed: () => context.push('/safety/emergency'),
            )
          : null,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _refresh,
          color: WeretTokens.brand,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: _md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Gap.h20(),
                const _HeaderBar(),

                if (error != null) ...[
                  Gap.h8(),
                  FormErrorCallout(
                    message: error,
                    onDismiss: _dismissError,
                  ),
                ],

                Gap.h20(),
                _MapPreview(
                  controller: _map,
                  pickup: _pickup,
                  destination: _destination,
                  previewPoints: _previewPoints,
                  nearbyPoints: active == null ? nearbyPoints : const [],
                  activeRide: active,
                  interactive: !_creating,
                ),

                Gap.h20(),
                _ModeSelector(
                  selectedType: _vehicleType,
                  onChanged: (t) {
                    setState(() => _vehicleType = t);
                    _refreshNearby();
                  },
                ),

                Gap.h20(),
                _SectionLabel('YOUR LOCATION'),
                Gap.h6(),
                _LocationField(
                  controller: _pickupCtrl,
                  hint: 'currentLocation'.tr(),
                  onTap: () => _openMapPicker(MapPickerMode.pickup),
                  enabled: !_creating && active == null,
                ),
                Gap.h12(),
                _SectionLabel('WHERE TO?'),
                Gap.h6(),
                _LocationField(
                  controller: _destCtrl,
                  hint: 'Destination',
                  onTap: () => _openMapPicker(MapPickerMode.destination),
                  enabled: !_creating && active == null,
                ),

                if (active == null) ...[
                  Gap.h12(),
                  ServiceTypeGallery(
                    selected: _vehicleType,
                    onSelected: (t) {
                      HapticFeedback.selectionClick();
                      setState(() => _vehicleType = t);
                      _refreshNearby();
                    },
                  ),
                ],

                if (active == null && _canBook) ...[
                  Gap.h12(),
                  _PassengerCountSelector(
                    count: _passengerCount,
                    onChanged: (v) => setState(() => _passengerCount = v),
                  ),
                ],

                Gap.h12(),
                if (active != null)
                  CustomButton(title: 'edit'.tr(), onPressed: () => _openMapPicker(_nextMissingField))
                else if (_canBook)
                  CustomButton(
                    title: 'requestRide'.tr(),
                    loading: _creating,
                    onPressed: _creating ? null : _book,
                  )
                else
                  CustomButton(
                    title: 'Set your route',
                    onPressed: () => _openMapPicker(_nextMissingField),
                  ),

                if (active != null) ...[
                  Gap.h12(),
                  ActiveRidePanel(ride: active),
                  if (hasOffer)
                    DriverOfferBanner(
                      ride: active,
                      loading: _offerLoading,
                      onAccept: () =>
                          _respondToOffer('${active['_id']}', true),
                      onReject: () =>
                          _respondToOffer('${active['_id']}', false),
                    ),
                  Gap.h8(),
                ],

                if (active == null && _canBook) ...[
                  Gap.h24(),
                  _NearbySection(
                    driverCount: ride.nearbyDrivers.length,
                    drivers: ride.nearbyDrivers,
                  ),
                ],

                Gap.h24(),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Extracted widgets
// ═══════════════════════════════════════════════════════════════════════

class _HeaderBar extends StatelessWidget {
  const _HeaderBar();

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const WeretLogo.wordmark(fontSize: 20),
        const Spacer(),
        IconButton(
          icon: const Icon(
            Icons.settings_outlined,
            color: WeretTokens.textSecondary,
            size: 24,
          ),
          onPressed: () => context.go('/passenger/settings'),
        ),
      ],
    );
  }
}

class _SectionLabel extends StatelessWidget {
  final String text;
  const _SectionLabel(this.text);

  @override
  Widget build(BuildContext context) => Text(text, style: AppStyles.sectionLabel);
}

class _MapPreview extends StatelessWidget {
  final MapController controller;
  final LatLng? pickup;
  final LatLng? destination;
  final List<LatLng> previewPoints;
  final List<LatLng> nearbyPoints;
  final Map<String, dynamic>? activeRide;
  final bool interactive;

  const _MapPreview({
    required this.controller,
    required this.pickup,
    required this.destination,
    required this.previewPoints,
    required this.nearbyPoints,
    required this.activeRide,
    required this.interactive,
  });

  @override
  Widget build(BuildContext context) {
    final ride = activeRide;
    return SizedBox(
      height: MediaQuery.of(context).size.height * _mapHeightFraction,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(_md),
        child: WeretRideMap(
          center: pickup ?? _defaultCenter,
          controller: controller,
          pickup: pickup,
          destination: destination,
          routePoints: previewPoints,
          nearbyDrivers: nearbyPoints,
          assignedDriver:
              ride != null ? driverLatLngFromRide(ride) : null,
          scene: ride != null
              ? buildPassengerMapScene(
                  activeRide: ride,
                  pickup: pickupFromRide(ride),
                  destination: destinationFromRide(ride),
                  driver: driverLatLngFromRide(ride),
                )
              : null,
          autoFit: previewPoints.length >= 2,
          interactive: interactive,
        ),
      ),
    );
  }
}

class _ModeSelector extends StatelessWidget {
  const _ModeSelector({
    required this.selectedType,
    required this.onChanged,
  });

  final String selectedType;
  final ValueChanged<String> onChanged;

  static const _rideTypes = {'travel', 'motorcycle', 'car_standard', 'car_comfort'};

  bool get _isRideMode => _rideTypes.contains(selectedType);

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _ModeCard(
            label: 'Ride',
            icon: Icons.directions_car_outlined,
            selected: _isRideMode,
            onTap: () {
              if (!_isRideMode) onChanged('travel');
            },
          ),
        ),
        const SizedBox(width: _sm),
        Expanded(
          child: _ModeCard(
            label: 'Send a package',
            image: AppAssets.deliveryVan,
            selected: !_isRideMode,
            onTap: () {
              if (_isRideMode) onChanged('delivery');
            },
          ),
        ),
      ],
    );
  }
}

class _ModeCard extends StatelessWidget {
  final String label;
  final IconData? icon;
  final String? image;
  final bool selected;
  final VoidCallback onTap;

  const _ModeCard({
    required this.label,
    this.icon,
    this.image,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return PressableScale(
      onTap: onTap,
      scale: 0.97,
      child: Container(
        height: 88,
        decoration: BoxDecoration(
          color: selected ? WeretTokens.brand : WeretTokens.surface,
          borderRadius: BorderRadius.circular(_md),
          border: Border.all(
            color: selected ? WeretTokens.brand : WeretTokens.borderSubtle,
            width: selected ? 1.5 : 1,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (image != null)
              Image.asset(image!, width: 44, height: 44)
            else
              Icon(
                icon,
                size: 32,
                color: selected ? WeretTokens.surface : WeretTokens.textPrimary,
              ),
            const SizedBox(height: _xs),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: selected ? WeretTokens.surface : WeretTokens.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LocationField extends StatelessWidget {
  final TextEditingController controller;
  final String hint;
  final VoidCallback onTap;
  final bool enabled;

  const _LocationField({
    required this.controller,
    required this.hint,
    required this.onTap,
    this.enabled = true,
  });

  @override
  Widget build(BuildContext context) {
    final hasText = controller.text.isNotEmpty;
    return GestureDetector(
      onTap: enabled ? onTap : null,
      child: Container(
        height: 50,
        padding: const EdgeInsets.symmetric(horizontal: _md),
        alignment: Alignment.centerLeft,
        decoration: BoxDecoration(
          color: WeretTokens.inputFill,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: WeretTokens.borderSubtle),
        ),
        child: Row(
          children: [
            Icon(
              hasText ? Icons.location_on : Icons.location_searching_outlined,
              size: 18,
              color: hasText ? WeretTokens.brand : WeretTokens.textMuted,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                hasText ? controller.text : hint,
                style: TextStyle(
                  color: hasText
                      ? WeretTokens.textPrimary
                      : WeretTokens.textMuted,
                  fontSize: 14,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            if (enabled)
              Icon(Icons.chevron_right, size: 18, color: WeretTokens.textMuted),
          ],
        ),
      ),
    );
  }
}

class _NearbySection extends StatelessWidget {
  final int driverCount;
  final List<dynamic> drivers;

  const _NearbySection({
    required this.driverCount,
    required this.drivers,
  });

  @override
  Widget build(BuildContext context) {
    final countLabel = '$driverCount DRIVERS NEARBY';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              'nearbyDrivers'.tr(),
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: WeretTokens.textPrimary,
              ),
            ),
            const Spacer(),
            if (driverCount > 0)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: WeretTokens.infoSoft,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  countLabel.toUpperCase(),
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: WeretTokens.onInfo,
                  ),
                ),
              ),
          ],
        ),
        Gap.h12(),
        if (drivers.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 20.0),
            child: Text(
              'nearbyEmpty'.tr(),
              style: const TextStyle(
                color: WeretTokens.textMuted,
                fontSize: 14,
              ),
            ),
          )
        else
          ...drivers.map(
            (d) => NearbyRideCard(
              driverName: '${d['name'] ?? d['driverName'] ?? ''}',
              rating: (d['rating'] as num?)?.toDouble() ?? 0,
              rideCount: (d['rideCount'] as num?)?.toInt() ?? 0,
              price: (d['price'] as num?)?.toDouble() ?? 0,
              departureTime: '${d['departureTime'] ?? ''}',
              arrivalTime: '${d['arrivalTime'] ?? ''}',
              fromLocation:
                  '${d['fromLocation'] ?? d['pickupAddress'] ?? ''}',
              toLocation:
                  '${d['toLocation'] ?? d['dropoffAddress'] ?? ''}',
              seatsLeft: (d['seatsLeft'] as num?)?.toInt() ?? 1,
            ),
          ),
      ],
    );
  }
}

// ── Passenger count selector ───────────────────────────────────────

class _PassengerCountSelector extends StatelessWidget {
  const _PassengerCountSelector({
    required this.count,
    required this.onChanged,
  });

  final int count;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: _md, vertical: _sm),
      decoration: BoxDecoration(
        color: WeretTokens.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: WeretTokens.borderSubtle),
      ),
      child: Row(
        children: [
          const Icon(Icons.people_outline, size: 20, color: WeretTokens.textSecondary),
          const SizedBox(width: 10),
          const Text('Passengers', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
          const Spacer(),
          IconButton(
            icon: const Icon(Icons.remove_circle_outline, size: 22),
            color: count > 1 ? WeretTokens.brand : WeretTokens.textMuted,
            onPressed: count > 1 ? () => onChanged(count - 1) : null,
          ),
          SizedBox(
            width: 36,
            child: Text(
              '$count',
              textAlign: TextAlign.center,
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.add_circle_outline, size: 22),
            color: count < 8 ? WeretTokens.brand : WeretTokens.textMuted,
            onPressed: count < 8 ? () => onChanged(count + 1) : null,
          ),
        ],
      ),
    );
  }
}
