import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/providers/admin_provider.dart';
import '../../../core/providers/auth_provider.dart';
import '../../../core/theme/weret_tokens.dart';
import 'admin_status_badge.dart';

class AdminModerationSheet extends ConsumerStatefulWidget {
  const AdminModerationSheet({super.key, required this.user});

  final Map<String, dynamic> user;

  static Future<void> show(BuildContext context, Map<String, dynamic> user) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => AdminModerationSheet(user: user),
    );
  }

  @override
  ConsumerState<AdminModerationSheet> createState() => _AdminModerationSheetState();
}

class _AdminModerationSheetState extends ConsumerState<AdminModerationSheet> {
  bool _busy = false;

  String get _userId => '${widget.user['_id'] ?? widget.user['id'] ?? ''}';

  Future<void> _run(Future<String?> Function() action, String successKey) async {
    if (_busy) return;
    setState(() => _busy = true);
    final err = await action();
    if (!mounted) return;
    setState(() => _busy = false);
    if (err != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err)));
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(successKey.tr())));
    Navigator.pop(context);
  }

  Future<bool> _confirm(String title) async {
    return await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: Text(title),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text('cancel'.tr())),
              FilledButton(onPressed: () => Navigator.pop(ctx, true), child: Text('confirm'.tr())),
            ],
          ),
        ) ??
        false;
  }

  @override
  Widget build(BuildContext context) {
    final u = widget.user;
    final me = ref.watch(authProvider).user?.id ?? '';
    final email = '${u['email'] ?? ''}'.toLowerCase();
    final blocked = userIsBlocked(u);
    final driverPending = userDriverApplicationStatus(u) == 'pending';
    final canDelete = _userId != me && !isFixedAdminEmail(email);
    final canBlock = _userId != me;

    return Container(
      margin: const EdgeInsets.fromLTRB(12, 0, 12, 16),
      decoration: BoxDecoration(
        color: WeretTokens.surface,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.12), blurRadius: 24, offset: const Offset(0, 8))],
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(18, 10, 18, 18),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 14),
                  decoration: BoxDecoration(color: WeretTokens.border, borderRadius: BorderRadius.circular(99)),
                ),
              ),
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('${u['name'] ?? '—'}', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18)),
                        Text('${u['email'] ?? ''}', style: const TextStyle(color: WeretTokens.textSecondary, fontSize: 13)),
                      ],
                    ),
                  ),
                  AdminStatusBadge.forUser(u),
                ],
              ),
              const SizedBox(height: 16),
              Text('adminSheetActions'.tr(), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _ActionChip(
                    icon: Icons.verified_outlined,
                    label: 'adminUserVerify'.tr(),
                    onTap: _busy
                        ? null
                        : () => _run(
                              () => ref.read(adminProvider.notifier).patchUser(_userId, {'is_verified': true}),
                              'adminActionDone',
                            ),
                  ),
                  if (driverPending) ...[
                    _ActionChip(
                      icon: Icons.check_circle_outline,
                      label: 'adminApproveDriver'.tr(),
                      tone: AdminBadgeTone.ok,
                      onTap: _busy
                          ? null
                          : () => _run(
                                () => ref.read(adminProvider.notifier).patchUser(_userId, {
                                  'driver_application_status': 'approved',
                                  'driver_profile_status': 'approved',
                                  'driver_review_note': '',
                                }),
                                'adminActionDone',
                              ),
                    ),
                    _ActionChip(
                      icon: Icons.cancel_outlined,
                      label: 'adminRejectDriver'.tr(),
                      tone: AdminBadgeTone.bad,
                      onTap: _busy
                          ? null
                          : () => _run(
                                () => ref.read(adminProvider.notifier).patchUser(_userId, {
                                  'driver_application_status': 'rejected',
                                  'driver_profile_status': 'rejected',
                                  'driver_review_note': 'adminDefaultRejectNote'.tr(),
                                }),
                                'adminActionDone',
                              ),
                    ),
                  ],
                  if (canBlock)
                    _ActionChip(
                      icon: blocked ? Icons.lock_open_outlined : Icons.block_outlined,
                      label: blocked ? 'adminUserUnblock'.tr() : 'adminUserBlock'.tr(),
                      tone: blocked ? AdminBadgeTone.ok : AdminBadgeTone.bad,
                      onTap: _busy
                          ? null
                          : () async {
                              if (!blocked) {
                                final ok = await _confirm('adminConfirmBlockTitle'.tr());
                                if (!ok) return;
                              }
                              await _run(
                                () => ref.read(adminProvider.notifier).patchUser(
                                      _userId,
                                      blocked
                                          ? {'is_blocked': false, 'blocked_until': null, 'block_reason': ''}
                                          : {'is_blocked': true, 'block_reason': 'adminUserBlockDefaultReason'.tr()},
                                    ),
                                'adminActionDone',
                              );
                            },
                    ),
                  if (canDelete)
                    _ActionChip(
                      icon: Icons.delete_outline,
                      label: 'adminUserDelete'.tr(),
                      tone: AdminBadgeTone.bad,
                      onTap: _busy
                          ? null
                          : () async {
                              final ok = await _confirm('adminUserDeleteConfirmTitle'.tr());
                              if (!ok) return;
                              await _run(() => ref.read(adminProvider.notifier).deleteUser(_userId), 'adminActionDone');
                            },
                    ),
                ],
              ),
              if (_busy)
                const Padding(
                  padding: EdgeInsets.only(top: 12),
                  child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ActionChip extends StatelessWidget {
  const _ActionChip({
    required this.icon,
    required this.label,
    required this.onTap,
    this.tone = AdminBadgeTone.neutral,
  });

  final IconData icon;
  final String label;
  final VoidCallback? onTap;
  final AdminBadgeTone tone;

  Color _color() {
    switch (tone) {
      case AdminBadgeTone.ok:
        return const Color(0xFF166534);
      case AdminBadgeTone.wait:
        return const Color(0xFF92400E);
      case AdminBadgeTone.bad:
        return WeretTokens.error;
      case AdminBadgeTone.neutral:
        return WeretTokens.brand;
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = _color();
    return Material(
      color: WeretTokens.inputFill.withValues(alpha: 0.5),
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 18, color: color),
              const SizedBox(width: 8),
              Text(label, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: color)),
            ],
          ),
        ),
      ),
    );
  }
}
