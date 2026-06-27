import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/theme/weret_tokens.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/error_state.dart';

const _pad = 16.0;
const _sm = 8.0;

class UserDisputeScreen extends ConsumerStatefulWidget {
  const UserDisputeScreen({super.key});
  @override
  ConsumerState<UserDisputeScreen> createState() => _UserDisputeScreenState();
}

class _UserDisputeScreenState extends ConsumerState<UserDisputeScreen> {
  List<Map<String, dynamic>> _disputes = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    HapticFeedback.mediumImpact();
    setState(() => _loading = true);
    try {
      final api = await ref.read(apiClientProvider.future);
      final data = await api.getJson(ApiEndpoints.disputesMine);
      setState(() {
        _disputes = (data['disputes'] as List? ?? []).map((e) => Map<String, dynamic>.from(e as Map)).toList();
        _loading = false;
      });
    } catch (e) {
      setState(() { _error = '$e'; _loading = false; });
    }
  }

  Color _statusColor(String status) => switch (status) {
    'open' => Colors.orange,
    'resolved' => Colors.green,
    'dismissed' => Colors.grey,
    _ => Colors.blue,
  };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WeretTokens.bg,
      appBar: AppBar(
        title: const Text('My Disputes', style: TextStyle(fontWeight: FontWeight.w700)),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: ErrorState(message: _error!, onRetry: _load),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  color: WeretTokens.brand,
                  child: _disputes.isEmpty
                      ? ListView(children: [
                          const SizedBox(height: 120),
                          const EmptyState(
                            icon: Icons.gavel_outlined,
                            title: 'No disputes yet',
                            subtitle: 'Any disputes you file will appear here.',
                          ),
                        ])
                      : ListView.builder(
                          padding: const EdgeInsets.all(_pad),
                          itemCount: _disputes.length,
                          itemBuilder: (_, i) {
                            final d = _disputes[i];
                            final status = '${d['status'] ?? ''}';
                            final ride = d['rideId'] is Map ? (d['rideId'] as Map) : null;
                            return _DisputeCard(
                              reason: '${d['reason'] ?? ''}',
                              status: status,
                              rideId: '${ride?['_id'] ?? '—'}',
                              statusColor: _statusColor(status),
                              onTap: () => context.push('/dispute/${d['_id']}'),
                            );
                          },
                        ),
                ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Extracted Widgets
// ═══════════════════════════════════════════════════════════════════════

class _DisputeCard extends StatelessWidget {
  const _DisputeCard({
    required this.reason,
    required this.status,
    required this.rideId,
    required this.statusColor,
    required this.onTap,
  });
  final String reason;
  final String status;
  final String rideId;
  final Color statusColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: _sm),
      child: ListTile(
        leading: Container(
          width: 40, height: 40,
          decoration: BoxDecoration(color: statusColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
          child: Icon(Icons.gavel, color: statusColor),
        ),
        title: Text(reason, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Status: $status'),
            Text('Ride: $rideId'),
          ],
        ),
        trailing: Chip(label: Text(status, style: TextStyle(fontSize: 11, color: statusColor)), backgroundColor: statusColor.withValues(alpha: 0.1)),
        onTap: onTap,
      ),
    );
  }
}
