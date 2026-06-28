import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/ride_provider.dart';
import '../../core/theme/weret_tokens.dart';

class DriverJoinRequestsSheet extends ConsumerStatefulWidget {
  final String rideId;
  const DriverJoinRequestsSheet({super.key, required this.rideId});

  @override
  ConsumerState<DriverJoinRequestsSheet> createState() => _DriverJoinRequestsSheetState();
}

class _DriverJoinRequestsSheetState extends ConsumerState<DriverJoinRequestsSheet> {
  List<dynamic> _requests = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final requests = await ref.read(rideProvider.notifier).fetchJoinRequests(widget.rideId);
      if (mounted) setState(() => _requests = requests);
    } catch (_) {
      if (mounted) setState(() => _requests = []);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _approve(String bookingId) async {
    try {
      await ref.read(rideProvider.notifier).approveJoin(widget.rideId, bookingId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Passenger approved')));
        _load();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  Future<void> _reject(String bookingId) async {
    try {
      await ref.read(rideProvider.notifier).rejectJoin(widget.rideId, bookingId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Request rejected')));
        _load();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      minChildSize: 0.3,
      maxChildSize: 0.9,
      expand: false,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: WeretTokens.bg,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              Container(
                margin: const EdgeInsets.symmetric(vertical: 10),
                width: 40, height: 4,
                decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Row(
                  children: [
                    const Text('Join Requests', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
                    const Spacer(),
                    if (_requests.isNotEmpty)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(color: WeretTokens.brand, borderRadius: BorderRadius.circular(10)),
                        child: Text('${_requests.length}', style: const TextStyle(color: Colors.white, fontSize: 12)),
                      ),
                  ],
                ),
              ),
              const Divider(height: 1),
              if (_loading)
                const Expanded(child: Center(child: CircularProgressIndicator()))
              else if (_requests.isEmpty)
                const Expanded(child: Center(child: Text('No pending requests', style: TextStyle(color: WeretTokens.textMuted))))
              else
                Expanded(
                  child: ListView.builder(
                    controller: scrollController,
                    padding: const EdgeInsets.all(16),
                    itemCount: _requests.length,
                    itemBuilder: (context, i) {
                      final req = _requests[i] as Map<String, dynamic>;
                      final passenger = req['passengerId'] is Map ? req['passengerId'] as Map : null;
                      final name = passenger?['name']?.toString() ?? 'Passenger';
                      final seats = req['seatsReserved'] ?? req['passengerCount'] ?? 1;
                      final id = '${req['_id']}';
                      return Card(
                        margin: const EdgeInsets.only(bottom: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Row(
                                children: [
                                  CircleAvatar(
                                    radius: 18,
                                    backgroundColor: WeretTokens.brand.withValues(alpha: 0.1),
                                    child: Text(name[0].toUpperCase(), style: const TextStyle(fontWeight: FontWeight.w700, color: WeretTokens.brand)),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                                        Text('$seats seat(s)', style: const TextStyle(color: WeretTokens.textMuted, fontSize: 12)),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 10),
                              Row(
                                children: [
                                  Expanded(
                                    child: OutlinedButton.icon(
                                      onPressed: () => _reject(id),
                                      icon: const Icon(Icons.close, size: 18),
                                      label: const Text('Reject'),
                                      style: OutlinedButton.styleFrom(
                                        foregroundColor: Colors.red,
                                        side: const BorderSide(color: Colors.red),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: FilledButton.icon(
                                      onPressed: () => _approve(id),
                                      icon: const Icon(Icons.check, size: 18),
                                      label: const Text('Approve'),
                                      style: FilledButton.styleFrom(
                                        backgroundColor: WeretTokens.brand,
                                        foregroundColor: Colors.white,
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                      ),
                                    ),
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
      },
    );
  }
}
