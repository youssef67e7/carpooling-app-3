import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../shared/widgets/weret_page_scaffold.dart';
import '../../shared/widgets/admin_cards.dart';
import '../../shared/widgets/ui/stagger_entrance.dart';

const _pad = 16.0;

class AdminMoreMenuScreen extends StatelessWidget {
  const AdminMoreMenuScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return WeretPageScaffold(
      title: 'tabMore'.tr(),
      body: ListView(
        padding: const EdgeInsets.all(_pad),
        children: [
          StaggerEntrance(
            spacing: 0,
            children: [
              AdminMenuRow(
                icon: Icons.build_outlined,
                title: 'adminToolsTitle'.tr().split('·').last.trim(),
                subtitle: 'adminToolsIntro'.tr(),
                onTap: () => context.push('/admin/more/tools'),
              ),
              AdminMenuRow(
                icon: Icons.flag_outlined,
                title: 'adminReportsTitle'.tr(),
                subtitle: 'adminReportsMenuSubtitle'.tr(),
                onTap: () => context.push('/admin/more/reports'),
              ),
              AdminMenuRow(
                icon: Icons.receipt_long_outlined,
                title: 'adminTransactionsTitle'.tr(),
                subtitle: 'adminTransactionsMenuSubtitle'.tr(),
                onTap: () => context.push('/admin/more/transactions'),
              ),
              AdminMenuRow(
                icon: Icons.list_alt_outlined,
                title: 'adminAuditTitle'.tr(),
                subtitle: 'adminAuditSubtitle'.tr(),
                onTap: () => context.push('/admin/more/audit'),
              ),
              AdminMenuRow(
                icon: Icons.local_offer,
                title: 'featurePromotions'.tr(),
                subtitle: 'featurePromotionsSubtitle'.tr(),
                onTap: () => context.push('/admin/more/promotions'),
              ),
              AdminMenuRow(
                icon: Icons.info_outline,
                title: 'featureAbout'.tr(),
                subtitle: 'featureAboutSubtitle'.tr(),
                onTap: () => context.push('/admin/more/about'),
              ),
              AdminMenuRow(
                icon: Icons.gavel,
                title: 'Disputes',
                subtitle: 'Manage ride disputes and user reports',
                onTap: () => context.push('/admin/more/disputes'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
