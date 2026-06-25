import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import '../../core/providers/admin_provider.dart';
import '../../core/theme/weret_tokens.dart';
import 'admin/admin_status_badge.dart';

class AdminRideCard extends StatelessWidget {
  const AdminRideCard({super.key, required this.ride});
  final Map<String, dynamic> ride;

  String _statusLabel(String? status) {
    if (status == null || status.isEmpty) return '—';
    final key = 'rideStatus_$status';
    final t = key.tr();
    return t == key ? status : t;
  }

  String? _person(dynamic v) {
    if (v is Map) return '${v['name'] ?? v['email']}';
    if (v is String && v.isNotEmpty) return v;
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final status = '${ride['status'] ?? ''}';
    final fare = ride['agreedFare'] ?? ride['estimatedFare'] ?? ride['fare'] ?? ride['passengerMinFare'];
    final vehicle = ride['vehicleType'] ?? ride['serviceType'];
    final passenger = _person(ride['passenger']) ?? _person(ride['passengerId']) ?? ride['passengerEmail'];
    final driver = _person(ride['driver']) ?? _person(ride['driverId']) ?? ride['driverName'];
    final rating = ride['passengerRating'];
    final review = '${ride['passengerReview'] ?? ''}'.trim();
    final id = '${ride['_id'] ?? ''}';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: WeretTokens.surface,
        borderRadius: BorderRadius.circular(WeretTokens.cardRadius),
        border: Border.all(color: WeretTokens.border.withValues(alpha: 0.75)),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, 2))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AdminStatusBadge(label: _statusLabel(status), tone: AdminBadgeTone.wait),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: WeretTokens.brand,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  children: [
                    Text('estimatedFare'.tr(), style: const TextStyle(color: Colors.white70, fontSize: 10)),
                    Text('$fare', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 18)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            vehicle != null ? 'vehicleType_$vehicle'.tr() : '—',
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
          ),
          const SizedBox(height: 6),
          Text('#${id.length > 8 ? id.substring(id.length - 8) : id}', style: const TextStyle(color: WeretTokens.textSecondary, fontSize: 12)),
          const Divider(height: 20),
          Text('${'passenger'.tr()}: ${passenger ?? '—'}', style: const TextStyle(fontSize: 13)),
          Text('${'driver'.tr()}: ${driver ?? '—'}', style: const TextStyle(fontSize: 13)),
          if (rating != null) ...[
            const SizedBox(height: 6),
            Text('${'adminAvgRating'.tr()}: $rating ★', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
          ],
          if (review.isNotEmpty)
            Text(review, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, color: WeretTokens.textSecondary)),
        ],
      ),
    );
  }
}

class AdminUserCard extends StatelessWidget {
  const AdminUserCard({super.key, required this.user, required this.onModerate});

  final Map<String, dynamic> user;
  final VoidCallback onModerate;

  @override
  Widget build(BuildContext context) {
    final u = user;
    final blocked = userIsBlocked(u);
    final online = u['isOnline'] == true || u['is_online'] == true;
    final nameStr = '${u['name'] ?? u['email'] ?? '?'}'.trim();
    final initial = nameStr.isNotEmpty ? nameStr[0].toUpperCase() : '?';

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: blocked ? const Color(0xFFFFF1F2) : WeretTokens.surface,
        borderRadius: BorderRadius.circular(WeretTokens.cardRadius),
        border: Border.all(color: blocked ? WeretTokens.error.withValues(alpha: 0.25) : WeretTokens.border.withValues(alpha: 0.8)),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(WeretTokens.cardRadius),
        onTap: onModerate,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              CircleAvatar(
                radius: 24,
                backgroundColor: WeretTokens.brand,
                child: Text(initial, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${u['name'] ?? '—'}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                    Text('${u['email'] ?? ''}', style: const TextStyle(color: WeretTokens.textSecondary, fontSize: 12)),
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        AdminStatusBadge.forUser(u),
                        if (online) AdminStatusBadge(label: 'driversOnline'.tr(), tone: AdminBadgeTone.ok),
                      ],
                    ),
                  ],
                ),
              ),
              Column(
                children: [
                  Icon(Icons.tune_rounded, color: WeretTokens.brand.withValues(alpha: 0.85)),
                  const SizedBox(height: 4),
                  Text('adminSheetActions'.tr(), style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class AdminMenuRow extends StatelessWidget {
  const AdminMenuRow({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: WeretTokens.inputFill.withValues(alpha: 0.45),
        borderRadius: BorderRadius.circular(WeretTokens.cardRadius),
        child: InkWell(
          borderRadius: BorderRadius.circular(WeretTokens.cardRadius),
          onTap: onTap,
          child: Container(
            decoration: BoxDecoration(
              border: Border.all(color: WeretTokens.border.withValues(alpha: 0.75)),
              borderRadius: BorderRadius.circular(WeretTokens.cardRadius),
            ),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: WeretTokens.brand,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(icon, color: Colors.white),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
                        const SizedBox(height: 2),
                        Text(subtitle, style: const TextStyle(color: WeretTokens.textSecondary, height: 1.3)),
                      ],
                    ),
                  ),
                  Container(
                    width: 28,
                    height: 28,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: WeretTokens.border),
                      color: WeretTokens.surface,
                    ),
                    child: const Icon(Icons.chevron_left, size: 18, color: WeretTokens.textSecondary),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
