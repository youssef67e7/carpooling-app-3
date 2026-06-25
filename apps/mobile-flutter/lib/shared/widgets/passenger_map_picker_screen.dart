import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import '../../core/providers/ride_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_styles.dart';
import '../../core/utils/map_scene_builder.dart';
import '../../shared/widgets/weret_ride_map.dart';

enum MapPickerMode { pickup, destination }

class PassengerMapPickerScreen extends ConsumerStatefulWidget {
  const PassengerMapPickerScreen({
    super.key,
    required this.initialCenter,
    required this.initialMode,
    this.initialPickup,
    this.initialDestination,
  });

  final LatLng initialCenter;
  final MapPickerMode initialMode;
  final LatLng? initialPickup;
  final LatLng? initialDestination;

  static Future<Map<String, LatLng?>?> open(
    BuildContext context, {
    required LatLng center,
    required MapPickerMode mode,
    LatLng? pickup,
    LatLng? destination,
  }) {
    return Navigator.of(context).push<Map<String, LatLng?>>(
      MaterialPageRoute(
        builder: (_) => PassengerMapPickerScreen(
          initialCenter: center,
          initialMode: mode,
          initialPickup: pickup,
          initialDestination: destination,
        ),
      ),
    );
  }

  @override
  ConsumerState<PassengerMapPickerScreen> createState() => _PassengerMapPickerScreenState();
}

class _PassengerMapPickerScreenState extends ConsumerState<PassengerMapPickerScreen> {
  late MapController _map;
  late MapPickerMode _mode;
  LatLng? _pickup;
  LatLng? _destination;
  LatLng _center = const LatLng(24.7136, 46.6753);
  List<LatLng> _routePoints = const [];

  @override
  void initState() {
    super.initState();
    _map = MapController();
    _mode = widget.initialMode;
    _pickup = widget.initialPickup;
    _destination = widget.initialDestination;
    _center = widget.initialCenter;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _map.move(_center, 14);
      _loadRoutePreview();
    });
  }

  Future<void> _loadRoutePreview() async {
    if (_pickup == null || _destination == null) return;
    final preview = await ref.read(rideProvider.notifier).fetchRoutePreview(
          _pickup!.latitude,
          _pickup!.longitude,
          _destination!.latitude,
          _destination!.longitude,
        );
    if (!mounted || preview == null) return;
    final pts = routePathFromPreview(preview);
    setState(() => _routePoints = pts);
    if (pts.length >= 2) {
      fitMapToPoints(_map, pts);
    }
  }

  void _applyCenter(LatLng p) {
    setState(() {
      _center = p;
      if (_mode == MapPickerMode.pickup) {
        _pickup = p;
      } else {
        _destination = p;
      }
    });
    _loadRoutePreview();
  }

  void _confirmCenter() {
    _applyCenter(_map.camera.center);
  }

  Future<void> _goToMyLocation() async {
    var perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) perm = await Geolocator.requestPermission();
    if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) return;
    final pos = await Geolocator.getCurrentPosition();
    final p = LatLng(pos.latitude, pos.longitude);
    _map.move(p, 15);
    _applyCenter(p);
  }

  @override
  Widget build(BuildContext context) {
    final scene = buildPassengerMapScene(
      pickup: _pickup,
      destination: _destination,
      previewRoute: _routePoints,
    );
    final bottomPad = MediaQuery.of(context).padding.bottom;

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Full‑screen map
          WeretRideMap(
            center: _center,
            controller: _map,
            height: MediaQuery.of(context).size.height,
            scene: scene,
            interactive: true,
            autoFit: false,
          ),

          // Center pin (existing behavior preserved)
          Center(
            child: IgnorePointer(
              child: Icon(Icons.location_pin, size: 44, color: Colors.red.shade700),
            ),
          ),

          // Back button — top left
          Positioned(
            top: MediaQuery.of(context).padding.top + 8,
            left: 16,
            child: Material(
              color: Colors.white,
              elevation: 0,
              shape: const CircleBorder(),
              child: InkWell(
                customBorder: const CircleBorder(),
                onTap: () => Navigator.pop(context),
                child: Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.1),
                        blurRadius: 4,
                      ),
                    ],
                  ),
                  child: const Icon(Icons.arrow_back, color: Colors.black, size: 20),
                ),
              ),
            ),
          ),

          // Location input card — top area
          Positioned(
            top: MediaQuery.of(context).padding.top + 64,
            left: 16,
            right: 16,
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 10,
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.circle, color: AppColors.textSecondary, size: 16),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          _pickup != null ? '${_pickup!.latitude.toStringAsFixed(4)}, ${_pickup!.longitude.toStringAsFixed(4)}' : 'passengerMapPickerPickup'.tr(),
                          style: const TextStyle(fontSize: 14, color: Colors.black),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  SizedBox(
                    height: 28,
                    child: Row(
                      children: [
                        const SizedBox(width: 8),
                        Column(
                          children: List.generate(
                            4,
                            (i) => Container(
                              margin: const EdgeInsets.symmetric(vertical: 2),
                              width: 2,
                              height: 3,
                              decoration: BoxDecoration(
                                color: AppColors.borderMedium,
                                borderRadius: BorderRadius.circular(1),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Row(
                    children: [
                      const Icon(Icons.location_on, color: AppColors.textSecondary, size: 16),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          _destination != null ? '${_destination!.latitude.toStringAsFixed(4)}, ${_destination!.longitude.toStringAsFixed(4)}' : 'passengerMapPickerDestination'.tr(),
                          style: const TextStyle(fontSize: 14, color: AppColors.textMuted),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          // GPS button — bottom right (above bottom card)
          Positioned(
            right: 16,
            bottom: 220 + bottomPad,
            child: Material(
              color: Colors.white,
              elevation: 0,
              shape: const CircleBorder(),
              child: InkWell(
                customBorder: const CircleBorder(),
                onTap: _goToMyLocation,
                child: Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.1),
                        blurRadius: 4,
                      ),
                    ],
                  ),
                  child: const Icon(Icons.my_location, color: Colors.black, size: 20),
                ),
              ),
            ),
          ),

          // Bottom ride info card
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Container(
              padding: EdgeInsets.fromLTRB(20, 20, 20, 20 + bottomPad),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(24),
                  topRight: Radius.circular(24),
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 10,
                    offset: const Offset(0, -2),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: Colors.black,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.drive_eta, color: Colors.white, size: 24),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Economy Ride', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16, color: Colors.black)),
                            const SizedBox(height: 2),
                            const Text('3 mins away', style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          const Text('EGP 12.50', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.black)),
                          Text('STANDARD', style: AppStyles.sectionLabel),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    height: 55,
                    child: FilledButton(
                      onPressed: () {
                        _confirmCenter();
                        Navigator.pop(context, {'pickup': _pickup, 'destination': _destination});
                      },
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                      ),
                      child: Text(_mode == MapPickerMode.pickup ? 'passengerMapPickerPickup'.tr() : 'passengerMapPickerDestination'.tr()),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
