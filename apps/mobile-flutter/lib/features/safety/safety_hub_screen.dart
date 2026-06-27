import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/weret_tokens.dart';

class _SafetyItem {
  const _SafetyItem(this.titleKey, this.icon, this.color, this.route, [this.needsActiveRide = false]);
  final String titleKey;
  final IconData icon;
  final Color color;
  final String route;
  final bool needsActiveRide;
}

class SafetyHubScreen extends StatelessWidget {
  const SafetyHubScreen({super.key});

  static const _items = [
    _SafetyItem('sosTitle', Icons.sos, Colors.red, '/safety/emergency'),
    _SafetyItem('trustedTitle', Icons.contacts, Colors.blue, '/safety/trusted-contacts'),
    _SafetyItem('shareTripTitle', Icons.share, Colors.green, '/safety/share-trip', true),
    _SafetyItem('verifyDriverTitle', Icons.verified_user, Colors.orange, '/safety/verify-driver'),
    _SafetyItem('reportIncidentTitle', Icons.flag, Colors.deepOrange, '/safety/report'),
    _SafetyItem('blockedTitle', Icons.block, Colors.grey, '/safety/blocked'),
    _SafetyItem('hotlineTitle', Icons.phone_enabled, Colors.red, '/safety/hotline'),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WeretTokens.bg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text('Safety', style: const TextStyle(fontWeight: FontWeight.w700)),
      ),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (_, i) {
          final item = _items[i];
          return Container(
            decoration: BoxDecoration(
              color: WeretTokens.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: WeretTokens.borderSubtle),
            ),
            child: ListTile(
              leading: Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: item.color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(item.icon, color: item.color),
              ),
              title: Text(item.titleKey.tr(), style: const TextStyle(fontWeight: FontWeight.w600)),
              trailing: const Icon(Icons.chevron_right, color: WeretTokens.textMuted),
              onTap: () {
                if (item.needsActiveRide) {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Available during an active ride')));
                  return;
                }
                context.push(item.route);
              },
            ),
          );
        },
      ),
    );
  }
}
