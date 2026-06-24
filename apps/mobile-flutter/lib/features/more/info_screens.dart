import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../shared/widgets/weret_info_screen.dart';

class HelpCenterScreen extends StatelessWidget {
  const HelpCenterScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('featureHelp'.tr())),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('helpIntro'.tr(), style: const TextStyle(height: 1.5)),
          const SizedBox(height: 16),
          ExpansionTile(title: Text('helpQ1'.tr()), children: [Padding(padding: const EdgeInsets.all(12), child: Text('helpA1'.tr()))]),
          ExpansionTile(title: Text('helpQ2'.tr()), children: [Padding(padding: const EdgeInsets.all(12), child: Text('helpA2'.tr()))]),
          ExpansionTile(title: Text('helpQ3'.tr()), children: [Padding(padding: const EdgeInsets.all(12), child: Text('helpA3'.tr()))]),
        ],
      ),
    );
  }
}

class SafetyTipsScreen extends StatelessWidget {
  const SafetyTipsScreen({super.key});
  @override
  Widget build(BuildContext context) => WeretInfoScreen(title: 'featureSafety'.tr(), body: 'featureSafetyBody'.tr());
}

class AboutWeretScreen extends StatelessWidget {
  const AboutWeretScreen({super.key});
  @override
  Widget build(BuildContext context) => WeretInfoScreen(title: 'featureAbout'.tr(), body: 'featureAboutBody'.tr());
}

class RideTipsScreen extends StatelessWidget {
  const RideTipsScreen({super.key});
  @override
  Widget build(BuildContext context) => WeretInfoScreen(title: 'featureRideTips'.tr(), body: 'featureRideTipsBody'.tr());
}

class SavedPlacesScreen extends StatelessWidget {
  const SavedPlacesScreen({super.key});
  @override
  Widget build(BuildContext context) => WeretInfoScreen(title: 'featureSavedPlaces'.tr(), body: 'featureSavedPlacesBody'.tr());
}

class NotificationSettingsScreen extends StatelessWidget {
  const NotificationSettingsScreen({super.key});
  @override
  Widget build(BuildContext context) => WeretInfoScreen(title: 'featureNotifications'.tr(), body: 'featureNotificationsBody'.tr());
}
