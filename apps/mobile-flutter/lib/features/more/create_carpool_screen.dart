import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/theme/weret_tokens.dart';
import '../../core/utils/show_alert.dart';

class CreateCarpoolScreen extends ConsumerStatefulWidget {
  const CreateCarpoolScreen({super.key});
  @override
  ConsumerState<CreateCarpoolScreen> createState() => _CreateCarpoolScreenState();
}

class _CreateCarpoolScreenState extends ConsumerState<CreateCarpoolScreen> {
  final _originAddrCtrl = TextEditingController();
  final _destAddrCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  double? _originLat, _originLng, _destLat, _destLng;
  TimeOfDay _time = TimeOfDay.now();
  int _seatsOffered = 2;
  String _vehicleType = 'car_standard';
  bool _loading = false;
  bool _repeatsMon = false, _repeatsTue = false, _repeatsWed = false, _repeatsThu = false, _repeatsFri = false;

  @override
  void dispose() {
    _originAddrCtrl.dispose();
    _destAddrCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  List<int> _selectedDays() {
    final days = <int>[];
    if (_repeatsMon) days.add(1);
    if (_repeatsTue) days.add(2);
    if (_repeatsWed) days.add(3);
    if (_repeatsThu) days.add(4);
    if (_repeatsFri) days.add(5);
    return days;
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(context: context, initialTime: _time);
    if (picked != null) setState(() => _time = picked);
  }

  Future<void> _create() async {
    if (_originLat == null || _destLat == null) {
      showAlert(context, 'error', 'Please enter origin and destination coordinates');
      return;
    }
    setState(() => _loading = true);
    try {
      final api = await ref.read(apiClientProvider.future);
      final now = DateTime.now();
      final dt = DateTime(now.year, now.month, now.day, _time.hour, _time.minute);
      await api.postJson(ApiEndpoints.carpoolsCreate, {
        'origin': {'lat': _originLat, 'lng': _originLng, 'address': _originAddrCtrl.text},
        'destination': {'lat': _destLat, 'lng': _destLng, 'address': _destAddrCtrl.text},
        'departureTime': dt.toIso8601String(),
        'flexibleMinutes': 15,
        'seatsOffered': _seatsOffered,
        'notes': _notesCtrl.text,
        'vehicleType': _vehicleType,
        'repeatDays': _selectedDays(),
      });
      if (mounted) {
        showAlert(context, 'success', 'Carpool created!');
        Navigator.of(context).pop();
      }
    } catch (e) {
      if (mounted) showAlert(context, 'error', '$e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WeretTokens.bg,
      appBar: AppBar(title: const Text('Schedule Carpool'), backgroundColor: Colors.transparent, elevation: 0),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(
            controller: _originAddrCtrl,
            decoration: InputDecoration(labelText: 'Origin address', border: OutlineInputBorder(borderRadius: BorderRadius.circular(12))),
            onChanged: (_) {},
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(child: TextField(decoration: InputDecoration(labelText: 'Origin lat', border: OutlineInputBorder(borderRadius: BorderRadius.circular(12))), keyboardType: TextInputType.number, onChanged: (v) => _originLat = double.tryParse(v))),
              const SizedBox(width: 8),
              Expanded(child: TextField(decoration: InputDecoration(labelText: 'Origin lng', border: OutlineInputBorder(borderRadius: BorderRadius.circular(12))), keyboardType: TextInputType.number, onChanged: (v) => _originLng = double.tryParse(v))),
            ],
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _destAddrCtrl,
            decoration: InputDecoration(labelText: 'Destination address', border: OutlineInputBorder(borderRadius: BorderRadius.circular(12))),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(child: TextField(decoration: InputDecoration(labelText: 'Dest lat', border: OutlineInputBorder(borderRadius: BorderRadius.circular(12))), keyboardType: TextInputType.number, onChanged: (v) => _destLat = double.tryParse(v))),
              const SizedBox(width: 8),
              Expanded(child: TextField(decoration: InputDecoration(labelText: 'Dest lng', border: OutlineInputBorder(borderRadius: BorderRadius.circular(12))), keyboardType: TextInputType.number, onChanged: (v) => _destLng = double.tryParse(v))),
            ],
          ),
          const SizedBox(height: 16),
          ListTile(contentPadding: EdgeInsets.zero, title: Text('Departure time: ${_time.format(context)}'), trailing: const Icon(Icons.access_time), onTap: _pickTime),
          const SizedBox(height: 8),
          Text('Seats offered: $_seatsOffered', style: const TextStyle(fontWeight: FontWeight.w600)),
          Slider(value: _seatsOffered.toDouble(), min: 1, max: 6, divisions: 5, label: '$_seatsOffered', onChanged: (v) => setState(() => _seatsOffered = v.round())),
          const SizedBox(height: 8),
          Text('Repeat (weekdays):', style: const TextStyle(fontWeight: FontWeight.w600)),
          Wrap(
            spacing: 8,
            children: [
              FilterChip(label: const Text('Mon'), selected: _repeatsMon, onSelected: (v) => setState(() => _repeatsMon = v)),
              FilterChip(label: const Text('Tue'), selected: _repeatsTue, onSelected: (v) => setState(() => _repeatsTue = v)),
              FilterChip(label: const Text('Wed'), selected: _repeatsWed, onSelected: (v) => setState(() => _repeatsWed = v)),
              FilterChip(label: const Text('Thu'), selected: _repeatsThu, onSelected: (v) => setState(() => _repeatsThu = v)),
              FilterChip(label: const Text('Fri'), selected: _repeatsFri, onSelected: (v) => setState(() => _repeatsFri = v)),
            ],
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _notesCtrl,
            decoration: InputDecoration(labelText: 'Notes (optional)', border: OutlineInputBorder(borderRadius: BorderRadius.circular(12))),
            maxLines: 3,
          ),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: _loading ? null : _create,
            style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
            child: _loading ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Create Carpool', style: TextStyle(fontSize: 16)),
          ),
        ],
      ),
    );
  }
}
