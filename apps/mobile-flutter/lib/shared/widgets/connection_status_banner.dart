import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/sync/api_sync_bridge.dart';
import '../../core/theme/weret_tokens.dart';

final healthProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final api = await ref.read(apiClientProvider.future);
  return api.getJson('/health');
});

class ConnectionStatusBanner extends ConsumerWidget {
  const ConnectionStatusBanner({super.key, this.compact = false});
  final bool compact;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final health = ref.watch(healthProvider);
    final apiSyncLive = ref.watch(apiSyncReadyProvider);

    return health.when(
      data: (data) {
        final dbOk = data['database'] == true || data['mongo'] == true;
        if (!dbOk) {
          return Text(
            'connectionDbDownShort'.tr(),
            style: TextStyle(color: WeretTokens.error, fontSize: compact ? 12 : 13, fontWeight: FontWeight.w600),
          );
        }
        if (apiSyncLive) {
          return Text(
            'connectionStackOkShort'.tr(),
            style: TextStyle(color: WeretTokens.success, fontSize: compact ? 13 : 14, fontWeight: FontWeight.w600),
          );
        }
        return Text(
          'connectionStackOkShort'.tr(),
          style: TextStyle(color: WeretTokens.success, fontSize: compact ? 13 : 14, fontWeight: FontWeight.w600),
        );
      },
      loading: () => Text(
        'connectionChecking'.tr(),
        style: TextStyle(color: WeretTokens.textSecondary, fontSize: compact ? 12 : 13),
      ),
      error: (_, __) => Text(
        'connectionApiDownShort'.tr(),
        style: TextStyle(color: WeretTokens.error, fontSize: compact ? 12 : 13),
      ),
    );
  }
}
