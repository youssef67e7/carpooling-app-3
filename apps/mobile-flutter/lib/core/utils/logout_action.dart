import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/auth_provider.dart';

Future<void> performLogout(WidgetRef ref, BuildContext context) async {
  final confirmed = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text('logout'.tr()),
          content: Text('logoutConfirm'.tr()),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text('cancel'.tr())),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: Text('logout'.tr())),
          ],
        ),
      ) ??
      false;
  if (!confirmed) return;
  await ref.read(authProvider.notifier).logout();
  if (context.mounted) context.go('/login');
}
