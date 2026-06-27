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

class AdminDisputeScreen extends ConsumerStatefulWidget {
  const AdminDisputeScreen({super.key});
  @override
  ConsumerState<AdminDisputeScreen> createState() => _AdminDisputeScreenState();
}

class _AdminDisputeScreenState extends ConsumerState<AdminDisputeScreen> {
  List<Map<String, dynamic>> _disputes = [];
  bool _loading = true;
  String? _error;
  String _statusFilter = '';
  int _page = 1;
  int _totalPages = 1;

  static const _statuses = ['', 'open', 'reviewing', 'resolved', 'dismissed'];
  static const _statusLabels = {'': 'All', 'open': 'Open', 'reviewing': 'Reviewing', 'resolved': 'Resolved', 'dismissed': 'Dismissed'};

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
      final params = <String, String>{'page': '$_page', 'limit': '20'};
      if (_statusFilter.isNotEmpty) params['status'] = _statusFilter;
      final data = await api.getJson(ApiEndpoints.disputesAdmin, query: params);
      setState(() {
        _disputes = (data['disputes'] as List? ?? []).map((e) => Map<String, dynamic>.from(e as Map)).toList();
        _totalPages = data['pages'] as int? ?? 1;
        _loading = false;
        _error = null;
      });
    } catch (e) {
      setState(() { _error = '$e'; _loading = false; });
    }
  }

  void _setFilter(String s) {
    HapticFeedback.lightImpact();
    setState(() { _statusFilter = s; _page = 1; });
    _load();
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
        title: const Text('Disputes', style: TextStyle(fontWeight: FontWeight.w700)),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: Column(
        children: [
          _DisputeFilterBar(
            selected: _statusFilter,
            onSelected: _setFilter,
          ),
          Expanded(
            child: _loading
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
                                  title: 'No disputes found',
                                  subtitle: 'All disputes will appear here.',
                                ),
                              ])
                            : ListView.builder(
                                itemCount: _disputes.length + 1,
                                itemBuilder: (_, i) {
                                  if (i == _disputes.length) {
                                    return _PaginationBar(
                                      page: _page,
                                      totalPages: _totalPages,
                                      onPrev: () { setState(() => _page--); _load(); },
                                      onNext: () { setState(() => _page++); _load(); },
                                    );
                                  }
                                  final d = _disputes[i];
                                  final initiator = d['initiatorId'] is Map ? '${(d['initiatorId'] as Map)['name'] ?? (d['initiatorId'] as Map)['email'] ?? '—'}' : '—';
                                  final ride = d['rideId'] is Map ? '${(d['rideId'] as Map)['_id'] ?? ''}' : '';
                                  final status = '${d['status'] ?? ''}';
                                  return _DisputeCard(
                                    initiator: initiator,
                                    reason: '${d['reason'] ?? ''}',
                                    ride: ride,
                                    status: status,
                                    statusColor: _statusColor(status),
                                    onTap: () => context.push('/admin/more/disputes/${d['_id']}'),
                                  );
                                },
                              ),
                      ),
          ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Extracted Widgets
// ═══════════════════════════════════════════════════════════════════════

class _DisputeFilterBar extends StatelessWidget {
  const _DisputeFilterBar({required this.selected, required this.onSelected});
  final String selected;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 48,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: _pad),
        children: _AdminDisputeScreenState._statuses.map((s) {
          final label = _AdminDisputeScreenState._statusLabels[s] ?? s;
          final isSelected = selected == s;
          return Padding(
            padding: const EdgeInsets.only(right: _sm),
            child: ChoiceChip(
              label: Text(label),
              selected: isSelected,
              onSelected: (_) => onSelected(s),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _DisputeCard extends StatelessWidget {
  const _DisputeCard({
    required this.initiator,
    required this.reason,
    required this.ride,
    required this.status,
    required this.statusColor,
    required this.onTap,
  });
  final String initiator;
  final String reason;
  final String ride;
  final String status;
  final Color statusColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final rideLabel = ride.length > 12 ? '${ride.substring(0, 12)}…' : ride;
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: _pad, vertical: 4),
      child: ListTile(
        leading: Container(
          width: 40, height: 40,
          decoration: BoxDecoration(color: statusColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
          child: Icon(Icons.gavel, color: statusColor),
        ),
        title: Text(initiator, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text('$reason\nRide: $rideLabel', maxLines: 2),
        trailing: Chip(label: Text(status, style: TextStyle(fontSize: 11, color: statusColor)), backgroundColor: statusColor.withValues(alpha: 0.1)),
        onTap: onTap,
      ),
    );
  }
}

class _PaginationBar extends StatelessWidget {
  const _PaginationBar({
    required this.page,
    required this.totalPages,
    required this.onPrev,
    required this.onNext,
  });
  final int page;
  final int totalPages;
  final VoidCallback onPrev;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(_pad),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (page > 1)
            TextButton(onPressed: onPrev, child: const Text('‹ Previous')),
          if (page > 1) const SizedBox(width: _pad),
          Text('$page / $totalPages'),
          if (page < totalPages) const SizedBox(width: _pad),
          if (page < totalPages)
            TextButton(onPressed: onNext, child: const Text('Next ›')),
        ],
      ),
    );
  }
}
