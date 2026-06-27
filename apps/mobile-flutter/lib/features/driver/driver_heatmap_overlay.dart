import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/theme/weret_tokens.dart';
import '../../core/utils/map_polyline_model.dart';
import '../../shared/widgets/weret_ride_map.dart';

class DriverHeatmapOverlay extends ConsumerStatefulWidget {
  const DriverHeatmapOverlay({super.key});
  @override
  ConsumerState<DriverHeatmapOverlay> createState() => _DriverHeatmapOverlayState();
}

class _DriverHeatmapOverlayState extends ConsumerState<DriverHeatmapOverlay> {
  List<HeatmapZone> _zones = [];
  bool _loading = true;
  final _map = MapController();
  int _totalRides = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _map.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final api = await ref.read(apiClientProvider.future);
      final data = await api.getJson(ApiEndpoints.driverHeatmap);
      final raw = (data['zones'] as List? ?? []).cast<Map<String, dynamic>>();
      _totalRides = (data['totalRides'] as num?)?.toInt() ?? 0;
      final zones = raw.map((z) {
        final lat = (z['lat'] as num).toDouble();
        final lng = (z['lng'] as num).toDouble();
        final count = (z['count'] as num).toInt();
        return HeatmapZone(center: LatLng(lat, lng), count: count);
      }).toList();
      if (!mounted) return;
      setState(() { _zones = zones; _loading = false; });
      if (zones.isNotEmpty) {
        final pts = zones.map((z) => z.center).toList();
        final bounds = LatLngBounds.fromPoints(pts);
        WidgetsBinding.instance.addPostFrameCallback((_) {
          _map.fitCamera(CameraFit.bounds(bounds: bounds, padding: const EdgeInsets.all(60)));
        });
      }
    } catch (e) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.75,
      padding: const EdgeInsets.only(top: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                const Icon(Icons.map, size: 20),
                const SizedBox(width: 8),
                Text('Demand Heatmap', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: WeretTokens.textPrimary)),
                const Spacer(),
                IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.of(context).pop()),
              ],
            ),
          ),
          const SizedBox(height: 8),
          if (!_loading)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(
                '${_zones.length} zones · $_totalRides rides (last 2h)',
                style: TextStyle(color: WeretTokens.textMuted, fontSize: 13),
              ),
            ),
          const SizedBox(height: 12),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _zones.isEmpty
                    ? Center(child: Text('No recent demand data', style: TextStyle(color: WeretTokens.textMuted)))
                    : ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: Stack(
                          children: [
                            WeretRideMap(
                              center: _zones.first.center,
                              controller: _map,
                              height: MediaQuery.of(context).size.height * 0.6,
                              heatmapZones: _zones,
                              interactive: true,
                              autoFit: false,
                              enableClustering: false,
                            ),
                          ],
                        ),
                      ),
          ),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () => Navigator.of(context).pop(),
                child: Text('close'.tr()),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
