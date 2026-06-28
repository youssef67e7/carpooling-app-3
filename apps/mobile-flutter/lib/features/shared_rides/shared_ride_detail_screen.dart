import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/ride_provider.dart';
import '../../core/theme/weret_tokens.dart';
import '../../shared/widgets/weret_text_field.dart';
import '../../core/utils/auth_validators.dart';

class SharedRideDetailScreen extends ConsumerStatefulWidget {
  const SharedRideDetailScreen({super.key, required this.rideId});
  final String rideId;
  static String routePath(String id) => '/shared-rides/$id';

  @override
  ConsumerState<SharedRideDetailScreen> createState() => _SharedRideDetailScreenState();
}

class _SharedRideDetailScreenState extends ConsumerState<SharedRideDetailScreen> {
  bool _requesting = false;
  bool _requested = false;
  bool _showForm = false;

  final _pickupCtrl = TextEditingController(text: 'Current Location');
  final _destCtrl = TextEditingController(text: 'Downtown');
  String _passengerGender = 'unspecified';
  int _passengerCount = 1;

  @override
  void dispose() {
    _pickupCtrl.dispose();
    _destCtrl.dispose();
    super.dispose();
  }

  Future<void> _requestJoin() async {
    setState(() => _requesting = true);
    try {
      await ref.read(rideProvider.notifier).requestJoin(widget.rideId, {
        'passengerCount': _passengerCount,
        'passengerGender': _passengerGender,
        'pickupLocation': {'lat': 24.7136, 'lng': 46.6753},
        'destinationLocation': {'lat': 24.7236, 'lng': 46.6853},
      });
      if (mounted) {
        setState(() => _requested = true);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Join request sent! Driver will review it.')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _requesting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final ride = ModalRoute.of(context)?.settings.extra as Map<String, dynamic>?;
    final driver = ride?['driverId'] is Map ? ride!['driverId'] as Map : null;
    final available = (ride?['availableSeatUnits'] as num?)?.toInt() ?? 0;
    final fare = ride?['agreedFare'] ?? ride?['estimatedFare'] ?? '—';

    return Scaffold(
      backgroundColor: WeretTokens.bg,
      appBar: AppBar(
        title: const Text('Ride Details'),
        backgroundColor: WeretTokens.bg,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      CircleAvatar(
                        backgroundColor: WeretTokens.brand.withValues(alpha: 0.1),
                        child: const Icon(Icons.person, color: WeretTokens.brand),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(driver?['name']?.toString() ?? 'Driver',
                            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                      ),
                    ],
                  ),
                  const Divider(height: 24),
                  _InfoRow(icon: Icons.local_taxi, label: 'Vehicle', value: ride?['vehicleType']?.toString() ?? '—'),
                  _InfoRow(icon: Icons.people, label: 'Available seats', value: '$available'),
                  _InfoRow(icon: Icons.attach_money, label: 'Estimated fare', value: '$fare'),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          if (_requested)
            const Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Row(
                  children: [
                    Icon(Icons.check_circle, color: Colors.green),
                    SizedBox(width: 12),
                    Expanded(child: Text('Join request sent. Waiting for driver approval.')),
                  ],
                ),
              ),
            )
          else if (!_showForm)
            FilledButton.icon(
              onPressed: () => setState(() => _showForm = true),
              icon: const Icon(Icons.add),
              label: const Text('Request to Join'),
              style: FilledButton.styleFrom(
                backgroundColor: WeretTokens.brand,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
            ),
          if (_showForm && !_requested) ...[
            Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text('Join Details', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                    const SizedBox(height: 12),
                    WeretTextField(
                      controller: _pickupCtrl,
                      hint: 'Your pickup',
                      prefixIcon: Icons.trip_origin,
                    ),
                    const SizedBox(height: 10),
                    WeretTextField(
                      controller: _destCtrl,
                      hint: 'Your destination',
                      prefixIcon: Icons.location_on,
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        const Text('Passengers:', style: TextStyle(fontSize: 13)),
                        const Spacer(),
                        IconButton(
                          icon: const Icon(Icons.remove_circle_outline),
                          onPressed: _passengerCount > 1 ? () => setState(() => _passengerCount--) : null,
                        ),
                        Text('$_passengerCount', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                        IconButton(
                          icon: const Icon(Icons.add_circle_outline),
                          onPressed: _passengerCount < 8 ? () => setState(() => _passengerCount++) : null,
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    DropdownButtonFormField<String>(
                      value: _passengerGender,
                      decoration: InputDecoration(
                        labelText: 'Gender',
                        filled: true,
                        fillColor: WeretTokens.inputFill,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      ),
                      items: const [
                        DropdownMenuItem(value: 'unspecified', child: Text('Prefer not to say')),
                        DropdownMenuItem(value: 'male', child: Text('Male')),
                        DropdownMenuItem(value: 'female', child: Text('Female')),
                      ],
                      onChanged: (v) => setState(() => _passengerGender = v ?? 'unspecified'),
                    ),
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: _requesting ? null : _requestJoin,
                      style: FilledButton.styleFrom(
                        backgroundColor: WeretTokens.brand,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      child: _requesting
                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Text('Send Request', style: TextStyle(fontWeight: FontWeight.w700)),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _InfoRow({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icon, size: 18, color: WeretTokens.textMuted),
          const SizedBox(width: 8),
          Text(label, style: const TextStyle(color: WeretTokens.textMuted, fontSize: 13)),
          const Spacer(),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
        ],
      ),
    );
  }
}
