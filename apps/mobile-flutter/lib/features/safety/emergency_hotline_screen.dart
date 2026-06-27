import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/theme/weret_tokens.dart';

class EmergencyHotlineScreen extends StatelessWidget {
  const EmergencyHotlineScreen({super.key});
  static const routePath = '/safety/hotline';

  static const _hotlines = [
    {'name': 'Police', 'number': '999'},
    {'name': 'Ambulance', 'number': '997'},
    {'name': 'Fire', 'number': '998'},
    {'name': 'Traffic Police', 'number': '993'},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WeretTokens.bg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text('hotlineTitle'.tr(), style: const TextStyle(fontWeight: FontWeight.w700)),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.local_police_rounded, color: WeretTokens.error, size: 28),
                const SizedBox(width: 12),
                Text('hotlineSubtitle'.tr(), style: TextStyle(color: WeretTokens.textSecondary, height: 1.4)),
              ],
            ),
            const SizedBox(height: 24),
            ..._hotlines.map((h) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Container(
                decoration: BoxDecoration(
                  color: WeretTokens.inputFill,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: WeretTokens.borderSubtle),
                ),
                child: ListTile(
                  leading: Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: WeretTokens.error.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(Icons.phone_in_talk_rounded, color: WeretTokens.error),
                  ),
                  title: Text(h['name']!, style: const TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: Text(h['number']!, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: WeretTokens.textPrimary)),
                  trailing: IconButton(
                    icon: const Icon(Icons.phone_enabled_rounded, color: WeretTokens.success),
                    onPressed: () => launchUrl(Uri.parse('tel:${h['number']}')),
                  ),
                ),
              ),
            )),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: WeretTokens.infoSoft,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info_outline, color: WeretTokens.onInfo, size: 20),
                  const SizedBox(width: 12),
                  Expanded(child: Text('hotlineDisclaimer'.tr(), style: TextStyle(color: WeretTokens.onInfo, fontSize: 13, height: 1.35))),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
