import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:go_router/go_router.dart';
import '../../shared/widgets/weret_info_screen.dart';
import '../../shared/widgets/weret_page_scaffold.dart';
import '../../shared/widgets/admin_cards.dart';

export '../more/info_screens.dart' show HelpCenterScreen, SafetyTipsScreen, AboutWeretScreen, RideTipsScreen, SavedPlacesScreen, NotificationSettingsScreen;
export 'admin_screens.dart' show AdminReportsScreen, AdminTransactionsScreen, AdminAuditLogScreen, AdminToolsScreen;
export '../more/driver_ratings_screen.dart' show DriverRatingsScreen;
export '../more/driver_cars_screen.dart' show DriverCarsScreen;
export '../more/driver_earnings_screen.dart' show DriverEarningsScreen;
export 'driver_onboarding_screen.dart';

class AdminMoreMenuScreen extends StatelessWidget {
  const AdminMoreMenuScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return WeretPageScaffold(
      title: 'tabMore'.tr(),
      body: ListView(
        padding: const EdgeInsets.all(16),
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
            icon: Icons.info_outline,
            title: 'featureAbout'.tr(),
            subtitle: 'featureAboutSubtitle'.tr(),
            onTap: () => context.push('/admin/more/about'),
          ),
        ],
      ),
    );
  }
}

class DriverCarEditorScreen extends StatelessWidget {
  const DriverCarEditorScreen({super.key});
  @override
  Widget build(BuildContext context) => WeretInfoScreen(title: 'driverMenuShipping'.tr(), body: 'driverApplyHint'.tr());
}

class DriverVehiclePickerScreen extends StatelessWidget {
  const DriverVehiclePickerScreen({super.key});
  @override
  Widget build(BuildContext context) => WeretInfoScreen(title: 'driverVehicleClass'.tr(), body: 'driverVehicleClassHint'.tr());
}

class DriverVehicleCategoryScreen extends StatelessWidget {
  const DriverVehicleCategoryScreen({super.key});
  @override
  Widget build(BuildContext context) => WeretInfoScreen(title: 'driverVehicleClass'.tr(), body: 'driverVehicleClassHint'.tr());
}

class DriverPaymentMethodsScreen extends StatelessWidget {
  const DriverPaymentMethodsScreen({super.key});
  @override
  Widget build(BuildContext context) => WeretInfoScreen(title: 'driverMenuWallet'.tr(), body: 'featureWalletSubtitle'.tr());
}

class InAppCallScreen extends StatelessWidget {
  const InAppCallScreen({super.key, required this.rideId});
  final String rideId;
  @override
  Widget build(BuildContext context) => WeretInfoScreen(title: 'inAppCallTitle'.tr(), body: 'inAppCallNeedsDevBuild'.tr());
}

class DriverTripFlowScreen extends StatelessWidget {
  const DriverTripFlowScreen({super.key});
  @override
  Widget build(BuildContext context) => WeretInfoScreen(title: 'driverTripFlowScreenTitle'.tr(), body: 'driverTripFlowScreenBody'.tr());
}

class DriverDemandScreen extends StatelessWidget {
  const DriverDemandScreen({super.key});
  @override
  Widget build(BuildContext context) => WeretInfoScreen(title: 'driverDemandScreenTitle'.tr(), body: 'driverDemandScreenBody'.tr());
}

class DriverInsightsScreen extends StatelessWidget {
  const DriverInsightsScreen({super.key});
  @override
  Widget build(BuildContext context) => WeretInfoScreen(title: 'driverInsightsScreenTitle'.tr(), body: 'driverInsightsScreenBody'.tr());
}

class DriverVehicleScreen extends StatelessWidget {
  const DriverVehicleScreen({super.key});
  @override
  Widget build(BuildContext context) => WeretInfoScreen(title: 'driverVehicleScreenTitle'.tr(), body: 'driverVehicleScreenBody'.tr());
}
