import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/theme/weret_tokens.dart';
import '../../core/utils/show_alert.dart';

class CarpoolSearchScreen extends ConsumerStatefulWidget {
  const CarpoolSearchScreen({super.key});
  @override
  ConsumerState<CarpoolSearchScreen> createState() => _CarpoolSearchScreenState();
}

class _CarpoolSearchScreenState extends ConsumerState<CarpoolSearchScreen> {
  List<Map<String, dynamic>> _results = [];
  bool _loading = false;
  String? _searched;
  final _oLatCtrl = TextEditingController();
  final _oLngCtrl = TextEditingController();
  final _dLatCtrl = TextEditingController();
  final _dLngCtrl = TextEditingController();

  @override
  void dispose() {
    _oLatCtrl.dispose();
    _oLngCtrl.dispose();
    _dLatCtrl.dispose();
    _dLngCtrl.dispose();
    super.dispose();
  }

  Future<void> _search() async {
    final oLat = _oLatCtrl.text.trim();
    final oLng = _oLngCtrl.text.trim();
    final dLat = _dLatCtrl.text.trim();
    final dLng = _dLngCtrl.text.trim();
    if (oLat.isEmpty || oLng.isEmpty || dLat.isEmpty || dLng.isEmpty) {
      showAlert(context, 'error', 'Enter origin and destination coordinates');
      return;
    }
    setState(() => _loading = true);
    try {
      final api = await ref.read(apiClientProvider.future);
      final data = await api.getJson(ApiEndpoints.carpoolsSearch, query: {'originLat': oLat, 'originLng': oLng, 'destLat': dLat, 'destLng': dLng});
      setState(() { _results = (data['carpools'] as List? ?? []).map((e) => Map<String, dynamic>.from(e as Map)).toList(); _loading = false; _searched = 'Searched'; });
    } catch (e) {
      setState(() => _loading = false);
      if (mounted) showAlert(context, 'error', '$e');
    }
  }

  Future<void> _book(String id, String driverId) async {
    try {
      final api = await ref.read(apiClientProvider.future);
      await api.postJson(ApiEndpoints.carpoolBook(id), {'seats': 1});
      if (mounted) {
        showAlert(context, 'success', 'Booked! Check My Carpools for details');
        _search();
      }
    } catch (e) {
      if (mounted) showAlert(context, 'error', '$e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WeretTokens.bg,
      appBar: AppBar(title: const Text('Find Carpools'), backgroundColor: Colors.transparent, elevation: 0),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            color: WeretTokens.surface,
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(child: TextField(controller: _oLatCtrl, decoration: InputDecoration(labelText: 'Origin lat', border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)), contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10)), keyboardType: TextInputType.number)),
                    const SizedBox(width: 8),
                    Expanded(child: TextField(controller: _oLngCtrl, decoration: InputDecoration(labelText: 'Origin lng', border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)), contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10)), keyboardType: TextInputType.number)),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(child: TextField(controller: _dLatCtrl, decoration: InputDecoration(labelText: 'Dest lat', border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)), contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10)), keyboardType: TextInputType.number)),
                    const SizedBox(width: 8),
                    Expanded(child: TextField(controller: _dLngCtrl, decoration: InputDecoration(labelText: 'Dest lng', border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)), contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10)), keyboardType: TextInputType.number)),
                  ],
                ),
                const SizedBox(height: 12),
                SizedBox(width: double.infinity, child: FilledButton(onPressed: _loading ? null : _search, child: _loading ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Search'))),
              ],
            ),
          ),
          Expanded(
            child: _results.isEmpty
                ? Center(
                    child: Text(
                      _searched == null ? 'Enter coordinates and search' : 'No carpools found nearby',
                      style: TextStyle(color: WeretTokens.textMuted),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _results.length,
                    itemBuilder: (_, i) {
                      final c = _results[i];
                      final driver = c['driverId'] is Map ? (c['driverId'] as Map) : null;
                      final profile = c['driverProfile'] is Map ? (c['driverProfile'] as Map) : null;
                      final name = driver?['name'] as String? ?? '—';
                      final photo = driver?['profileImageUrl'] as String? ?? '';
                      final rating = (profile?['rating'] as num?)?.toDouble() ?? 0;
                      final carModel = profile?['carModel'] as String? ?? '';
                      final seats = c['seatsAvailable'] as int? ?? 0;
                      final dt = c['departureTime'] as String? ?? '';
                      String _addr(Map c, String key) {
                        final route = c['route'];
                        if (route is! Map) return '';
                        final loc = route[key];
                        if (loc is! Map) return '';
                        return (loc['address'] as String?) ?? '';
                      }
                      final originAddr = _addr(c, 'origin');
                      final destAddr = _addr(c, 'destination');
                      final driverId = driver?['_id'] as String? ?? '';
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  CircleAvatar(
                                    radius: 20,
                                    backgroundColor: WeretTokens.inputFill,
                                    backgroundImage: photo.isNotEmpty ? NetworkImage(photo) : null,
                                    child: photo.isEmpty ? const Icon(Icons.person, size: 20) : null,
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(name, style: const TextStyle(fontWeight: FontWeight.w600)),
                                        if (carModel.isNotEmpty) Text(carModel, style: TextStyle(color: WeretTokens.textMuted, fontSize: 12)),
                                      ],
                                    ),
                                  ),
                                  if (rating > 0)
                                    Chip(
                                      avatar: const Icon(Icons.star, size: 14, color: Colors.amber),
                                      label: Text(rating.toStringAsFixed(1), style: const TextStyle(fontSize: 11)),
                                      visualDensity: VisualDensity.compact,
                                    ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              if (originAddr.isNotEmpty) Text('From: $originAddr', style: TextStyle(color: WeretTokens.textSecondary, fontSize: 13)),
                              if (destAddr.isNotEmpty) Text('To: $destAddr', style: TextStyle(color: WeretTokens.textSecondary, fontSize: 13)),
                              if (dt.isNotEmpty) Text('Departure: ${dt.substring(0, 16).replaceAll('T', ' ')}', style: TextStyle(color: WeretTokens.textMuted, fontSize: 12)),
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(color: WeretTokens.success.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
                                    child: Text('$seats seats available', style: TextStyle(color: WeretTokens.success, fontWeight: FontWeight.w600, fontSize: 12)),
                                  ),
                                  const Spacer(),
                                  FilledButton.tonal(
                                    onPressed: driverId.isEmpty ? null : () => _book(c['_id'] as String? ?? '', driverId),
                                    child: const Text('Book'),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
