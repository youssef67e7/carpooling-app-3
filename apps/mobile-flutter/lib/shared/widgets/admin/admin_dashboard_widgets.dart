import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import '../../../core/theme/weret_tokens.dart';

class AdminCommandBanner extends StatelessWidget {
  const AdminCommandBanner({
    super.key,
    required this.driversOnline,
    required this.activeRides,
    required this.openReports,
    this.updatedAt,
  });

  final int driversOnline;
  final int activeRides;
  final int openReports;
  final DateTime? updatedAt;

  @override
  Widget build(BuildContext context) {
    final time = updatedAt != null
        ? DateFormat.jm(context.locale.toString()).format(updatedAt!)
        : '—';
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF2D2E32), Color(0xFF3D3F45), Color(0xFF2D2E32)],
        ),
        boxShadow: [BoxShadow(color: WeretTokens.brand.withValues(alpha: 0.35), blurRadius: 24, offset: const Offset(0, 10))],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _LivePulseDot(),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('adminLiveCommand'.tr(), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 16)),
                const SizedBox(height: 6),
                Text(
                  'adminLiveCommandSub'.tr(namedArgs: {
                    'online': '$driversOnline',
                    'active': '$activeRides',
                    'reports': '$openReports',
                  }),
                  style: TextStyle(color: Colors.white.withValues(alpha: 0.72), fontSize: 12, fontWeight: FontWeight.w600, height: 1.35),
                ),
                const SizedBox(height: 8),
                Text('adminLastUpdated'.tr(namedArgs: {'time': time}), style: TextStyle(color: Colors.white.withValues(alpha: 0.5), fontSize: 11)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _LivePulseDot extends StatefulWidget {
  const _LivePulseDot();

  @override
  State<_LivePulseDot> createState() => _LivePulseDotState();
}

class _LivePulseDotState extends State<_LivePulseDot> with SingleTickerProviderStateMixin {
  late final AnimationController _c;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 2000))..repeat();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _c,
      builder: (_, __) {
        final pulse = 0.5 + 0.5 * (1 - (_c.value * 2 % 1));
        return Container(
          width: 12,
          height: 12,
          margin: const EdgeInsets.only(top: 4),
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: WeretTokens.success,
            boxShadow: [BoxShadow(color: WeretTokens.success.withValues(alpha: 0.35 + 0.35 * pulse), blurRadius: 4 + 8 * pulse)],
          ),
        );
      },
    );
  }
}

class AdminRideStatusChart extends StatelessWidget {
  const AdminRideStatusChart({super.key, required this.ridesByStatus});

  final Map<String, dynamic> ridesByStatus;

  static const _colors = {
    'pending': Color(0xFFF59E0B),
    'accepted': Color(0xFF3B82F6),
    'ongoing': Color(0xFF22C55E),
    'completed': Color(0xFF64748B),
    'cancelled': Color(0xFFEF4444),
  };

  String _statusLabel(String status) {
    final key = 'rideStatus_$status';
    final label = key.tr();
    return label == key ? status : label;
  }

  @override
  Widget build(BuildContext context) {
    if (ridesByStatus.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Text('noRidesAdmin'.tr(), style: const TextStyle(color: WeretTokens.textSecondary, fontWeight: FontWeight.w600)),
      );
    }
    const order = ['pending', 'accepted', 'ongoing', 'completed', 'cancelled'];
    final keys = <dynamic>{...order, ...ridesByStatus.keys.map((e) => e.toString())}
        .where((k) => (ridesByStatus[k] as num?) != null && (ridesByStatus[k] as num) > 0)
        .toList();
    final total = keys.fold<int>(0, (s, k) => s + ((ridesByStatus[k] as num?)?.toInt() ?? 0));

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: WeretTokens.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: WeretTokens.border.withValues(alpha: 0.65)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: keys.map((k) {
            final n = (ridesByStatus[k] as num?)?.toInt() ?? 0;
            final pct = total > 0 ? n / total : 0.0;
            final color = _colors[k] ?? WeretTokens.textSecondary;
            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Expanded(child: Text(_statusLabel(k), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12))),
                      Text('$n', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(999),
                    child: LinearProgressIndicator(value: pct, minHeight: 8, backgroundColor: WeretTokens.inputFill, color: color),
                  ),
                ],
              ),
            );
          }).toList(),
        ),
      ),
    );
  }
}

class AdminActivityFeed extends StatelessWidget {
  const AdminActivityFeed({
    super.key,
    required this.recentRides,
    required this.recentActivity,
  });

  final List<dynamic> recentRides;
  final List<dynamic> recentActivity;

  @override
  Widget build(BuildContext context) {
    final items = <_ActivityItem>[];
    for (final raw in recentRides) {
      if (raw is! Map) continue;
      final m = Map<String, dynamic>.from(raw);
      final ts = m['createdAt'];
      final status = '${m['status'] ?? ''}';
      final statusKey = 'rideStatus_$status';
      final statusLabel = statusKey.tr();
      items.add(_ActivityItem(
        at: ts != null ? DateTime.tryParse('$ts') : null,
        icon: Icons.local_taxi_outlined,
        text: 'adminActivityRide'.tr(namedArgs: {
          'status': statusLabel == statusKey ? status : statusLabel,
          'name': '${m['passenger'] ?? m['driver'] ?? '—'}',
        }),
      ));
    }
    for (final raw in recentActivity) {
      if (raw is! Map) continue;
      final m = Map<String, dynamic>.from(raw);
      final ts = m['createdAt'];
      items.add(_ActivityItem(
        at: ts != null ? DateTime.tryParse('$ts') : null,
        icon: Icons.rule_folder_outlined,
        text: 'adminActivityAudit'.tr(namedArgs: {
          'actor': '${m['actor'] ?? 'Admin'}',
          'summary': '${m['summary'] ?? m['action'] ?? '—'}',
        }),
      ));
    }
    items.sort((a, b) {
      final ta = a.at ?? DateTime.fromMillisecondsSinceEpoch(0);
      final tb = b.at ?? DateTime.fromMillisecondsSinceEpoch(0);
      return tb.compareTo(ta);
    });
    final slice = items.take(10).toList();

    if (slice.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Text('adminNoActivity'.tr(), style: const TextStyle(color: WeretTokens.textSecondary, fontWeight: FontWeight.w600)),
      );
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        decoration: BoxDecoration(
          color: WeretTokens.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: WeretTokens.border.withValues(alpha: 0.65)),
        ),
        child: ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          padding: const EdgeInsets.all(10),
          itemCount: slice.length,
          separatorBuilder: (_, __) => const SizedBox(height: 6),
          itemBuilder: (_, i) {
            final it = slice[i];
            return Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: WeretTokens.inputFill.withValues(alpha: 0.45),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: WeretTokens.border.withValues(alpha: 0.5)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(it.icon, size: 18, color: WeretTokens.brand),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(it.text, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12, height: 1.35)),
                        if (it.at != null)
                          Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Text(DateFormat.yMMMd(context.locale.toString()).add_jm().format(it.at!), style: const TextStyle(fontSize: 10, color: WeretTokens.textSecondary)),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _ActivityItem {
  const _ActivityItem({required this.icon, required this.text, this.at});
  final IconData icon;
  final String text;
  final DateTime? at;
}
