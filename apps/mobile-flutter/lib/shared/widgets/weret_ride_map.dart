import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../core/theme/weret_tokens.dart';
import '../../core/utils/clustering_utils.dart';
import '../../core/utils/map_polyline_model.dart';
import '../../core/utils/map_provider.dart';
import '../../core/utils/map_scene_builder.dart';
import 'map/driver_map_marker.dart';

class WeretRideMap extends StatefulWidget {
  const WeretRideMap({
    super.key,
    required this.center,
    this.controller,
    this.height = 170,
    this.scene,
    this.pickup,
    this.destination,
    this.nearbyDrivers = const [],
    this.assignedDriver,
    this.routePoints = const [],
    this.polylines = const [],
    this.driverBearing,
    this.etaMinutes,
    this.legendKey,
    this.fitPoints = const [],
    this.autoFit = true,
    this.interactive = false,
    this.heatmapZones = const [],
    this.enableClustering = true,
  });

  final LatLng center;
  final MapController? controller;
  final double height;
  final WeretMapScene? scene;
  final LatLng? pickup;
  final LatLng? destination;
  final List<LatLng> nearbyDrivers;
  final LatLng? assignedDriver;
  final List<LatLng> routePoints;
  final List<WeretMapPolyline> polylines;
  final double? driverBearing;
  final int? etaMinutes;
  final String? legendKey;
  final List<LatLng> fitPoints;
  final bool autoFit;
  final bool interactive;
  final List<HeatmapZone> heatmapZones;
  final bool enableClustering;

  @override
  State<WeretRideMap> createState() => _WeretRideMapState();
}

LatLng _sanitize(LatLng p) => LatLng(
      p.latitude.isFinite ? p.latitude : 0,
      p.longitude.isFinite ? p.longitude : 0,
    );

class _WeretRideMapState extends State<WeretRideMap> with SingleTickerProviderStateMixin {
  LatLng? _displayDriver;
  AnimationController? _anim;
  Animation<double>? _tween;
  LatLng? _fromDriver;
  LatLng? _toDriver;
  LatLngBounds? _visibleBounds;
  double _currentZoom = 13;

  @override
  void initState() {
    super.initState();
    _anim = AnimationController(vsync: this, duration: const Duration(milliseconds: 650));
    _displayDriver = _driverPoint;
    WidgetsBinding.instance.addPostFrameCallback((_) => _maybeFit());
  }

  @override
  void didUpdateWidget(WeretRideMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    final next = _driverPoint;
    if (next != null && next != _displayDriver) {
      _fromDriver = _displayDriver ?? next;
      _toDriver = next;
      _tween = Tween<double>(begin: 0, end: 1).animate(CurvedAnimation(parent: _anim!, curve: Curves.easeInOut));
      _anim!
        ..reset()
        ..forward();
    } else if (next == null) {
      _displayDriver = null;
    }
    if (widget.fitPoints != oldWidget.fitPoints || widget.scene?.fitPoints != oldWidget.scene?.fitPoints) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _maybeFit());
    }
  }

  @override
  void dispose() {
    _anim?.dispose();
    super.dispose();
  }

  LatLng? get _driverPoint => widget.scene?.driver ?? widget.assignedDriver;

  List<WeretMapPolyline> get _polylines {
    if (widget.scene != null && widget.scene!.polylines.isNotEmpty) return widget.scene!.polylines;
    if (widget.polylines.isNotEmpty) return widget.polylines;
    if (widget.routePoints.length >= 2) {
      return [WeretMapPolyline(points: widget.routePoints, color: WeretTokens.brand, strokeWidth: 4)];
    }
    return const [];
  }

  List<LatLng> get _fitPoints {
    if (widget.scene != null && widget.scene!.fitPoints.isNotEmpty) return widget.scene!.fitPoints;
    return widget.fitPoints;
  }

  int? get _eta => widget.scene?.etaMinutes ?? widget.etaMinutes;

  String? get _legend => widget.scene?.legendKey ?? widget.legendKey;

  double? get _bearing => widget.scene?.driverBearing ?? widget.driverBearing;

  LatLng? get _pickup => widget.scene?.pickup ?? widget.pickup;
  LatLng? get _destination => widget.scene?.destination ?? widget.destination;
  List<LatLng> get _nearby => widget.scene?.nearbyDrivers ?? widget.nearbyDrivers;

  /// Cull nearby markers to those within visible bounds.
  List<LatLng> get _culledNearby {
    final all = _nearby;
    if (all.isEmpty || _visibleBounds == null) return all;
    return all.where((p) => _visibleBounds!.contains(p) && p.latitude.isFinite && p.longitude.isFinite).toList();
  }

  /// Clustered view of culled nearby markers.
  List<DriverCluster> get _clusteredNearby {
    final culled = _culledNearby;
    if (culled.isEmpty) return const [];
    if (!widget.enableClustering) return culled.map((p) => DriverCluster(centroid: p, points: [p])).toList();
    return clusterDrivers(culled, _currentZoom);
  }

  /// Cull polylines — keep entire polyline if any point is visible.
  List<WeretMapPolyline> get _culledPolylines {
    final all = _polylines;
    if (all.isEmpty || _visibleBounds == null) return all;
    return all.where((poly) {
      if (poly.points.isEmpty) return false;
      // Keep polyline if any point is visible (avoids broken segments).
      return poly.points.any((p) => _visibleBounds!.contains(p) && p.latitude.isFinite && p.longitude.isFinite);
    }).toList();
  }

  void _maybeFit() {
    if (!widget.autoFit) return;
    final pts = _fitPoints.where((p) => p.latitude.isFinite && p.longitude.isFinite).toList();
    if (pts.length >= 2) fitMapToPoints(widget.controller, pts);
  }

  void _onMapEvent(MapEvent event) {
    if (event is MapEventMoveEnd) {
      final cam = widget.controller?.camera;
      if (cam != null) {
        final bounds = cam.visibleBounds;
        final zoom = cam.zoom;
        if (_visibleBounds != bounds || _currentZoom != zoom) {
          setState(() {
            _visibleBounds = bounds;
            _currentZoom = zoom;
          });
        }
      }
    }
  }

  LatLng? _animatedDriver() {
    if (_toDriver == null) return _displayDriver;
    if (_fromDriver == null || _tween == null) return _toDriver;
    final t = _tween!.value;
    return LatLng(
      _fromDriver!.latitude + (_toDriver!.latitude - _fromDriver!.latitude) * t,
      _fromDriver!.longitude + (_toDriver!.longitude - _fromDriver!.longitude) * t,
    );
  }

  @override
  Widget build(BuildContext context) {
    _anim?.removeListener(_onAnim);
    _anim?.addListener(_onAnim);

    final flags = widget.interactive ? InteractiveFlag.all : InteractiveFlag.none;
    final driverPoint = _animatedDriver() ?? _driverPoint;
    final polylines = _culledPolylines;
    final clusters = _clusteredNearby;
    final zones = widget.heatmapZones;

    return ClipRRect(
      borderRadius: BorderRadius.circular(WeretTokens.cardRadius),
      child: SizedBox(
        height: widget.height,
        child: Stack(
          children: [
              FlutterMap(
                mapController: widget.controller,
                options: MapOptions(
                  initialCenter: _sanitize(widget.center),
                  initialZoom: 13,
                  interactionOptions: InteractionOptions(flags: flags),
                  onMapEvent: _onMapEvent,
                ),
              children: [
                TileLayer(
                  urlTemplate: MapProvider.tileUrlTemplate,
                  userAgentPackageName: 'com.weret.mobile',
                  tileProvider: MapProvider.tileProvider,
                ),
                if (polylines.isNotEmpty)
                  PolylineLayer(
                    polylines: polylines
                        .where((p) => p.points.length >= 2)
                        .map(
                          (p) => Polyline(
                            points: p.points.map((pt) => _sanitize(pt)).toList(),
                            color: p.color,
                            strokeWidth: p.strokeWidth,
                            pattern: p.dashed ? StrokePattern.dashed(segments: const [12, 10]) : const StrokePattern.solid(),
                          ),
                        )
                        .toList(),
                  ),
                if (zones.isNotEmpty)
                  MarkerLayer(
                    markers: zones.map((z) {
                      final intensity = (z.count / 20.0).clamp(0.0, 1.0);
                      final r = (255 * (1 - intensity)).round();
                      final g = (255 * (1 - intensity * 0.6)).round();
                      final size = (12.0 + intensity * 20).clamp(12.0, 32.0);
                      return Marker(
                        point: _sanitize(z.center),
                        width: size + 6,
                        height: size + 6,
                        child: Container(
                          decoration: BoxDecoration(
                            color: Color.fromARGB((180 * intensity).round().clamp(60, 180), r, g, 60),
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white.withValues(alpha: 0.6), width: 1.5),
                          ),
                          child: Center(
                            child: Text(
                              '${z.count}',
                              style: TextStyle(
                                fontSize: (size * 0.4).clamp(7.0, 13.0),
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                if (clusters.isNotEmpty)
                  MarkerLayer(
                    markers: clusters.map((c) {
                      if (c.count > 1) {
                        return Marker(
                          point: _sanitize(c.centroid),
                          width: 40,
                          height: 40,
                          child: _ClusterMarker(count: c.count),
                        );
                      }
                      return Marker(
                        point: _sanitize(c.centroid),
                        width: 28,
                        height: 28,
                        child: const NearbyDriverMarker(),
                      );
                    }).toList(),
                  ),
                if (driverPoint != null)
                  MarkerLayer(
                    markers: [
                      Marker(
                        point: _sanitize(driverPoint),
                        width: 44,
                        height: 44,
                        child: DriverMapMarker(bearing: _bearing, pulse: true),
                      ),
                    ],
                  ),
                if (_pickup != null)
                  MarkerLayer(
                    markers: [
                      Marker(
                        point: _sanitize(_pickup!),
                        width: 34,
                        height: 34,
                        child: const Icon(Icons.trip_origin, color: Colors.green, size: 28),
                      ),
                    ],
                  ),
                if (_destination != null)
                  MarkerLayer(
                    markers: [
                      Marker(
                        point: _sanitize(_destination!),
                        width: 34,
                        height: 34,
                        child: const Icon(Icons.place, color: Colors.red, size: 30),
                      ),
                    ],
                  ),
              ],
            ),
            if (_eta != null && _eta! > 0)
              Positioned(
                top: 10,
                left: 10,
                child: _MapChip(
                  icon: Icons.schedule,
                  label: 'mapEtaMinutes'.tr(namedArgs: {'min': '$_eta'}),
                ),
              ),
            if (_legend != null)
              Positioned(
                left: 10,
                right: 10,
                bottom: 8,
                child: _MapChip(
                  icon: Icons.info_outline,
                  label: _legend!.tr(),
                  expanded: true,
                ),
              ),
            const Positioned(
              right: 6,
              bottom: 4,
              child: Opacity(
                opacity: 0.65,
                child: Text('© OSM', style: TextStyle(fontSize: 9, color: Colors.black87)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _onAnim() {
    if (_tween == null) return;
    setState(() => _displayDriver = _animatedDriver());
    if (_tween!.isCompleted) {
      _displayDriver = _toDriver;
      _fromDriver = _toDriver;
    }
  }
}

class _ClusterMarker extends StatelessWidget {
  const _ClusterMarker({required this.count});
  final int count;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: WeretTokens.brand,
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white, width: 2.5),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.28), blurRadius: 8, offset: const Offset(0, 2))],
      ),
      child: Center(
        child: Text(
          '$count',
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13),
        ),
      ),
    );
  }
}

class _MapChip extends StatelessWidget {
  const _MapChip({required this.icon, required this.label, this.expanded = false});
  final IconData icon;
  final String label;
  final bool expanded;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white.withValues(alpha: 0.94),
      elevation: 2,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        child: Row(
          mainAxisSize: expanded ? MainAxisSize.max : MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: WeretTokens.brand),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                label,
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, height: 1.25),
                maxLines: expanded ? 2 : 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Map with expand CTA + recenter + optional fit.
class WeretRideMapWithExpand extends StatelessWidget {
  const WeretRideMapWithExpand({
    super.key,
    required this.center,
    this.controller,
    this.height = 170,
    this.scene,
    this.pickup,
    this.destination,
    this.nearbyDrivers = const [],
    this.assignedDriver,
    this.routePoints = const [],
    this.polylines = const [],
    this.fitPoints = const [],
    this.autoFit = true,
    required this.expandLabel,
    required this.onExpand,
    this.onRecenter,
    this.onFitRoute,
    this.heatmapZones = const [],
    this.enableClustering = true,
  });

  final LatLng center;
  final MapController? controller;
  final double height;
  final WeretMapScene? scene;
  final LatLng? pickup;
  final LatLng? destination;
  final List<LatLng> nearbyDrivers;
  final LatLng? assignedDriver;
  final List<LatLng> routePoints;
  final List<WeretMapPolyline> polylines;
  final List<LatLng> fitPoints;
  final bool autoFit;
  final String expandLabel;
  final VoidCallback onExpand;
  final VoidCallback? onRecenter;
  final VoidCallback? onFitRoute;
  final List<HeatmapZone> heatmapZones;
  final bool enableClustering;

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        WeretRideMap(
          center: center,
          controller: controller,
          height: height,
          scene: scene,
          pickup: pickup,
          destination: destination,
          nearbyDrivers: nearbyDrivers,
          assignedDriver: assignedDriver,
          routePoints: routePoints,
          polylines: polylines,
          fitPoints: fitPoints,
          autoFit: autoFit,
          interactive: true,
          heatmapZones: heatmapZones,
          enableClustering: enableClustering,
        ),
        if (onRecenter != null)
          Positioned(
            top: 8,
            right: 8,
            child: Material(
              color: WeretTokens.surface,
              shape: const CircleBorder(),
              elevation: 1,
              child: IconButton(
                tooltip: 'mapRecenter'.tr(),
                icon: const Icon(Icons.gps_fixed, size: 20),
                onPressed: onRecenter,
              ),
            ),
          ),
        if (onFitRoute != null)
          Positioned(
            top: 8,
            right: 52,
            child: Material(
              color: WeretTokens.surface,
              shape: const CircleBorder(),
              elevation: 1,
              child: IconButton(
                tooltip: 'mapFitRoute'.tr(),
                icon: const Icon(Icons.fit_screen, size: 20),
                onPressed: onFitRoute,
              ),
            ),
          ),
        Positioned(
          left: 12,
          right: 12,
          bottom: 12,
          child: Material(
            color: WeretTokens.brand,
            borderRadius: BorderRadius.circular(WeretTokens.pillRadius),
            child: InkWell(
              borderRadius: BorderRadius.circular(WeretTokens.pillRadius),
              onTap: onExpand,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.open_in_full, color: Colors.white, size: 18),
                    const SizedBox(width: 8),
                    Flexible(
                      child: Text(
                        expandLabel,
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
