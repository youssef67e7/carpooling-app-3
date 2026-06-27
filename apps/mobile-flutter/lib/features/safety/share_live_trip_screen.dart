import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/weret_tokens.dart';
import 'safety_provider.dart';

class ShareLiveTripScreen extends ConsumerWidget {
  const ShareLiveTripScreen({super.key, required this.rideId});
  final String rideId;
  static const routePath = '/safety/share-trip';

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: WeretTokens.bg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text('shareTripTitle'.tr(), style: const TextStyle(fontWeight: FontWeight.w700)),
      ),
      body: FutureBuilder<String>(
        future: ref.read(safetyServiceProvider).shareTrip(rideId),
        builder: (ctx, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError) {
            return Center(child: Text('Error: ${snap.error}'));
          }
          final link = snap.data ?? '';
          return Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                const SizedBox(height: 40),
                Icon(Icons.share_rounded, size: 72, color: WeretTokens.brand),
                const SizedBox(height: 24),
                Text('shareTripBody'.tr(), style: const TextStyle(fontSize: 16, height: 1.4), textAlign: TextAlign.center),
                const SizedBox(height: 32),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: WeretTokens.inputFill,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: WeretTokens.borderSubtle),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(link, style: const TextStyle(fontSize: 13), maxLines: 2, overflow: TextOverflow.ellipsis),
                      ),
                      const SizedBox(width: 8),
                      IconButton(
                        icon: const Icon(Icons.copy),
                        onPressed: () {
                          Clipboard.setData(ClipboardData(text: link));
                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('shareTripCopied'.tr())));
                        },
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                Text('shareTripHint'.tr(), style: TextStyle(fontSize: 13, color: WeretTokens.textMuted, height: 1.4), textAlign: TextAlign.center),
              ],
            ),
          );
        },
      ),
    );
  }
}
