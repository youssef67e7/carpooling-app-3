import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import '../../core/providers/ride_provider.dart';
import '../../core/theme/weret_tokens.dart';
import '../../core/utils/map_scene_builder.dart';
import '../../shared/widgets/custom_button.dart';
import '../../shared/widgets/weret_ambient_background.dart';
import '../../shared/widgets/weret_pill_toggle.dart';
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

  String get _title => _mode == MapPickerMode.pickup
      ? 'passengerMapPickerPickup'.tr()
      : 'passengerMapPickerDestination'.tr();

  String get _hint => _mode == MapPickerMode.pickup
      ? 'passengerMapPickerHintPickup'.tr()
      : 'passengerMapPickerHintDestination'.tr();

  @override
  Widget build(BuildContext context) {
    final scene = buildPassengerMapScene(
      pickup: _pickup,
      destination: _destination,
      previewRoute: _routePoints,
    );

    return Scaffold(
      backgroundColor: WeretTokens.bg,
      appBar: AppBar(
        leading: IconButton(icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20), onPressed: () => Navigator.pop(context)),
        title: Text(_title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        actions: [
          IconButton(
            tooltip: 'mapFitRoute'.tr(),
            icon: const Icon(Icons.fit_screen),
            onPressed: () => fitMapToPoints(_map, scene.fitPoints),
          ),
        ],
      ),
      body: WeretAmbientBackground(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
              child: WeretMapModeToggle(
                pickupSelected: _mode == MapPickerMode.pickup,
                onPickup: () => setState(() => _mode = MapPickerMode.pickup),
                onDestination: () => setState(() => _mode = MapPickerMode.destination),
                pickupLabel: 'pickup'.tr(),
                destinationLabel: 'destination'.tr(),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    return Stack(
                      alignment: Alignment.center,
                      children: [
                        WeretRideMap(
                          center: _center,
                          controller: _map,
                          height: constraints.maxHeight,
                          scene: scene,
                          interactive: true,
                          autoFit: false,
                        ),
                        IgnorePointer(child: Icon(Icons.location_pin, size: 44, color: Colors.red.shade700)),
                        Positioned(
                          top: 10,
                          right: 10,
                          child: Material(
                            color: WeretTokens.surface,
                            shape: const CircleBorder(),
                            elevation: 1,
                            child: IconButton(
                              tooltip: 'mapRecenter'.tr(),
                              icon: const Icon(Icons.my_location, size: 20),
                              onPressed: _goToMyLocation,
                            ),
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(_hint, textAlign: TextAlign.center, style: const TextStyle(color: WeretTokens.textSecondary, height: 1.4)),
                  const SizedBox(height: 12),
                  CustomButton(
                    title: 'passengerMapPickerDone'.tr(),
                    onPressed: () {
                      _confirmCenter();
                      Navigator.pop(context, {'pickup': _pickup, 'destination': _destination});
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
