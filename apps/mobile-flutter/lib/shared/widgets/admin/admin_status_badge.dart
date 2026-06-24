import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import '../../../core/providers/admin_provider.dart';
import '../../../core/theme/weret_tokens.dart';

enum AdminBadgeTone { ok, wait, bad, neutral }

class AdminStatusBadge extends StatelessWidget {
  const AdminStatusBadge({super.key, required this.label, this.tone = AdminBadgeTone.neutral});

  final String label;
  final AdminBadgeTone tone;

  Color get _fg {
    switch (tone) {
      case AdminBadgeTone.ok:
        return const Color(0xFF166534);
      case AdminBadgeTone.wait:
        return const Color(0xFF92400E);
      case AdminBadgeTone.bad:
        return WeretTokens.error;
      case AdminBadgeTone.neutral:
        return WeretTokens.textSecondary;
    }
  }

  Color get _bg {
    switch (tone) {
      case AdminBadgeTone.ok:
        return const Color(0xFFDCFCE7);
      case AdminBadgeTone.wait:
        return const Color(0xFFFEF3C7);
      case AdminBadgeTone.bad:
        return const Color(0xFFFEE2E2);
      case AdminBadgeTone.neutral:
        return WeretTokens.inputFill;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(color: _bg, borderRadius: BorderRadius.circular(999)),
      child: Text(label, style: TextStyle(color: _fg, fontWeight: FontWeight.w700, fontSize: 11)),
    );
  }

  static Widget forUser(Map<String, dynamic> u) {
    if (userIsBlocked(u)) {
      return AdminStatusBadge(label: 'adminBadgeBlocked'.tr(), tone: AdminBadgeTone.bad);
    }
    final driverStatus = userDriverApplicationStatus(u);
    if (driverStatus == 'pending') {
      return AdminStatusBadge(label: 'adminBadgeDriverPending'.tr(), tone: AdminBadgeTone.wait);
    }
    if (driverStatus == 'rejected') {
      return AdminStatusBadge(label: 'adminRejectDriver'.tr(), tone: AdminBadgeTone.bad);
    }
    if (driverStatus == 'approved') {
      return AdminStatusBadge(label: 'adminApproveDriver'.tr(), tone: AdminBadgeTone.ok);
    }
    if (!userIsVerified(u)) {
      return AdminStatusBadge(label: 'adminBadgePending'.tr(), tone: AdminBadgeTone.wait);
    }
    return AdminStatusBadge(label: 'adminBadgeVerified'.tr(), tone: AdminBadgeTone.ok);
  }
}
