import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/referral_provider.dart';
import '../../core/theme/weret_tokens.dart';
import '../../shared/widgets/weret_page_scaffold.dart';

class ReferralScreen extends ConsumerStatefulWidget {
  const ReferralScreen({super.key});
  @override
  ConsumerState<ReferralScreen> createState() => _ReferralScreenState();
}

class _ReferralScreenState extends ConsumerState<ReferralScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() async {
      await ref.read(referralProvider.notifier).fetchMyCode();
      await ref.read(referralProvider.notifier).fetchRewards();
    });
  }

  void _showApplySheet() {
    final codeCtrl = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(left: 24, right: 24, top: 24, bottom: MediaQuery.of(ctx).viewInsets.bottom + 24),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Text('referralApplyTitle'.tr(), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            TextField(controller: codeCtrl, decoration: InputDecoration(labelText: 'referralCode'.tr(), border: const OutlineInputBorder(), hintText: 'ABC123'), textCapitalization: TextCapitalization.characters),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () async {
                try {
                  await ref.read(referralProvider.notifier).apply(codeCtrl.text.trim());
                  if (ctx.mounted) {
                    ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(content: Text('referralApplied'.tr())));
                    Navigator.of(ctx).pop();
                  }
                } catch (e) {
                  if (ctx.mounted) {
                    ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(content: Text('$e')));
                  }
                }
              },
              child: Text('referralApply'.tr()),
            ),
          ]),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(referralProvider);

    return WeretPageScaffold(
      title: 'driverMenuInvite'.tr(),
      body: s.loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(colors: [WeretTokens.brand, WeretTokens.brand.withValues(alpha: 0.8)]),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Column(children: [
                    const Icon(Icons.card_giftcard, size: 48, color: Colors.white),
                    const SizedBox(height: 12),
                    Text('referralInviteIntro'.tr(), textAlign: TextAlign.center, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    Text('referralInviteBody'.tr(), textAlign: TextAlign.center, style: const TextStyle(color: Colors.white70, fontSize: 13)),
                    const SizedBox(height: 16),
                    if (s.code != null)
                      InkWell(
                        onTap: () {
                          Clipboard.setData(ClipboardData(text: s.code!));
                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('referralCopied'.tr())));
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                          decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(12)),
                          child: Row(mainAxisSize: MainAxisSize.min, children: [
                            Text(s.code!, style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold, letterSpacing: 4)),
                            const SizedBox(width: 12),
                            const Icon(Icons.copy, color: Colors.white70, size: 20),
                          ]),
                        ),
                      ),
                    const SizedBox(height: 12),
                    Text('referralTapToCopy'.tr(), style: const TextStyle(color: Colors.white60, fontSize: 12)),
                  ]),
                ),
                const SizedBox(height: 24),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(color: WeretTokens.surface, borderRadius: BorderRadius.circular(16)),
                  child: Row(children: [
                    const Icon(Icons.people, color: WeretTokens.brand),
                    const SizedBox(width: 12),
                    Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('referralRewards'.tr(), style: const TextStyle(fontWeight: FontWeight.w700)),
                      Text('${s.rewards} ${'referralFriends'.tr()}', style: TextStyle(color: WeretTokens.textSecondary, fontSize: 13)),
                    ]),
                    const Spacer(),
                    Text('${s.rewards}', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: WeretTokens.brand)),
                  ]),
                ),
                const SizedBox(height: 24),
                Text('referralHistory'.tr(), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                if (s.referredUsers.isEmpty)
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text('referralNoHistory'.tr(), style: TextStyle(color: WeretTokens.textMuted)),
                  )
                else
                  ...s.referredUsers.map((u) {
                    final name = u['name'] as String? ?? '';
                    final date = u['appliedAt'] as String? ?? '';
                    return Card(
                      margin: const EdgeInsets.symmetric(vertical: 4),
                      child: ListTile(
                        leading: CircleAvatar(child: Text(name.isNotEmpty ? name[0].toUpperCase() : '?')),
                        title: Text(name),
                        subtitle: Text(date.isNotEmpty ? DateTime.parse(date).toLocal().toString().split('.')[0] : ''),
                      ),
                    );
                  }),
                const SizedBox(height: 16),
                OutlinedButton.icon(
                  onPressed: _showApplySheet,
                  icon: const Icon(Icons.code),
                  label: Text('referralHaveCode'.tr()),
                ),
              ],
            ),
    );
  }
}
