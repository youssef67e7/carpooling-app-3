import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/theme/weret_tokens.dart';
import '../../core/utils/show_alert.dart';

class MyCarpoolsScreen extends ConsumerStatefulWidget {
  const MyCarpoolsScreen({super.key});
  @override
  ConsumerState<MyCarpoolsScreen> createState() => _MyCarpoolsScreenState();
}

class _MyCarpoolsScreenState extends ConsumerState<MyCarpoolsScreen> {
  List<Map<String, dynamic>> _asDriver = [];
  List<Map<String, dynamic>> _asPassenger = [];
  bool _loading = true;

  String _carpoolTitle(Map c) {
    final route = c['route'];
    if (route is! Map) return 'Carpool';
    final origin = route['origin'];
    final destination = route['destination'];
    final addr = (origin is Map ? origin['address'] : null) ?? (destination is Map ? destination['address'] : null) ?? 'Carpool';
    return '$addr';
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final api = await ref.read(apiClientProvider.future);
      final data = await api.getJson(ApiEndpoints.carpoolsMine);
      setState(() {
        _asDriver = (data['asDriver'] as List? ?? []).map((e) => Map<String, dynamic>.from(e as Map)).toList();
        _asPassenger = (data['asPassenger'] as List? ?? []).map((e) => Map<String, dynamic>.from(e as Map)).toList();
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  Future<void> _cancel(String id) async {
    try {
      final api = await ref.read(apiClientProvider.future);
      await api.delete(ApiEndpoints.carpoolCancel(id));
      if (mounted) showAlert(context, 'success', 'Carpool cancelled');
      _load();
    } catch (e) {
      if (mounted) showAlert(context, 'error', '$e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WeretTokens.bg,
      appBar: AppBar(title: const Text('My Carpools'), backgroundColor: Colors.transparent, elevation: 0),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (_asDriver.isNotEmpty) ...[
                    Text('As Driver', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16, color: WeretTokens.textPrimary)),
                    const SizedBox(height: 8),
                    ..._asDriver.map((c) => Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          child: ListTile(
                            title: Text(_carpoolTitle(c)),
                            subtitle: Text('Seats: ${c['seatsAvailable']}/${c['seatsOffered']}  |  Status: ${c['status']}'),
                            trailing: c['status'] == 'active'
                                ? IconButton(icon: const Icon(Icons.cancel, color: Colors.red), onPressed: () => _cancel('${c['_id']}'))
                                : null,
                          ),
                        )),
                    const SizedBox(height: 16),
                  ],
                  if (_asPassenger.isNotEmpty) ...[
                    Text('As Passenger', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16, color: WeretTokens.textPrimary)),
                    const SizedBox(height: 8),
                    ..._asPassenger.map((b) {
                      final booking = b['booking'] is Map ? (b['booking'] as Map) : {};
                      final ride = booking['rideId'] is Map ? (booking['rideId'] as Map) : {};
                      final driver = ride['driverId'] is Map ? (ride['driverId'] as Map) : null;
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          title: Text('Booked with ${driver?['name'] ?? 'driver'}'),
                          subtitle: Text('Seats: ${booking['passengerCount'] ?? 1}'),
                        ),
                      );
                    }),
                  ],
                  if (_asDriver.isEmpty && _asPassenger.isEmpty)
                    Padding(
                      padding: const EdgeInsets.all(32),
                      child: Text('No carpools yet. Drivers can schedule a ride from the profile menu.', textAlign: TextAlign.center, style: TextStyle(color: WeretTokens.textMuted)),
                    ),
                ],
              ),
            ),
    );
  }
}
