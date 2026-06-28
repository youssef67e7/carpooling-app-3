import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/ride_provider.dart';
import '../../core/theme/weret_tokens.dart';
import '../../shared/widgets/weret_text_field.dart';

class SharedRidesScreen extends ConsumerStatefulWidget {
  const SharedRidesScreen({super.key});
  static const routePath = '/shared-rides';

  @override
  ConsumerState<SharedRidesScreen> createState() => _SharedRidesScreenState();
}

class _SharedRidesScreenState extends ConsumerState<SharedRidesScreen> {
  final _pickupCtrl = TextEditingController();
  final _destCtrl = TextEditingController();
  double? _pickupLat, _pickupLng, _destLat, _destLng;
  String _vehicleType = 'car_standard';
  List<dynamic> _results = [];
  bool _loading = false;

  @override
  void dispose() {
    _pickupCtrl.dispose();
    _destCtrl.dispose();
    super.dispose();
  }

  Future<void> _search() async {
    if (_pickupLat == null || _destLat == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please set both pickup and destination')),
      );
      return;
    }
    setState(() => _loading = true);
    try {
      final rides = await ref.read(rideProvider.notifier).fetchPoolMatches({
        'pickupLocation': {'lat': _pickupLat, 'lng': _pickupLng},
        'destinationLocation': {'lat': _destLat, 'lng': _destLng},
        'vehicleType': _vehicleType,
        'passengerCount': 1,
      });
      setState(() => _results = rides);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _setPickup() {
    // Simplified: in production, use a map picker
    _pickupCtrl.text = 'Current Location';
    _pickupLat = 24.7136;
    _pickupLng = 46.6753;
    setState(() {});
  }

  void _setDestination() {
    _destCtrl.text = 'Downtown';
    _destLat = 24.7236;
    _destLng = 46.6853;
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WeretTokens.bg,
      appBar: AppBar(
        title: const Text('Shared Rides'),
        backgroundColor: WeretTokens.bg,
        elevation: 0,
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                WeretTextField(
                  controller: _pickupCtrl,
                  hint: 'Pickup location',
                  prefixIcon: Icons.trip_origin,
                  readOnly: true,
                  onTap: _setPickup,
                ),
                const SizedBox(height: 10),
                WeretTextField(
                  controller: _destCtrl,
                  hint: 'Destination',
                  prefixIcon: Icons.location_on,
                  readOnly: true,
                  onTap: _setDestination,
                ),
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  value: _vehicleType,
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: WeretTokens.inputFill,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'car_standard', child: Text('Standard')),
                    DropdownMenuItem(value: 'car_comfort', child: Text('Comfort')),
                    DropdownMenuItem(value: 'travel', child: Text('Travel')),
                  ],
                  onChanged: (v) => setState(() => _vehicleType = v ?? 'car_standard'),
                ),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: _loading ? null : _search,
                  style: FilledButton.styleFrom(
                    backgroundColor: WeretTokens.brand,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: _loading
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Find Shared Rides', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                ),
              ],
            ),
          ),
          if (_results.isEmpty && !_loading)
            const Expanded(
              child: Center(child: Text('No shared rides found', style: TextStyle(color: WeretTokens.textMuted))),
            ),
          if (_results.isNotEmpty)
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: _results.length,
                itemBuilder: (context, i) {
                  final ride = _results[i] as Map<String, dynamic>;
                  return _SharedRideCard(
                    ride: ride,
                    onTap: () => context.push('/shared-rides/${ride['_id']}', extra: ride),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}

class _SharedRideCard extends StatelessWidget {
  final Map<String, dynamic> ride;
  final VoidCallback onTap;
  const _SharedRideCard({required this.ride, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final driver = ride['driverId'] is Map ? ride['driverId'] as Map : null;
    final available = ride['availableSeatUnits'] as num? ?? 0;
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        leading: CircleAvatar(
          backgroundColor: WeretTokens.brand.withValues(alpha: 0.1),
          child: const Icon(Icons.person, color: WeretTokens.brand),
        ),
        title: Text(driver?['name']?.toString() ?? 'Driver', style: const TextStyle(fontWeight: FontWeight.w700)),
        subtitle: Text('$available seat(s) available', style: const TextStyle(fontSize: 12)),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}
