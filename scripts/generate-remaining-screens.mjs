#!/usr/bin/env node
/** Generate remaining Flutter screens with functional UI */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const LIB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "apps", "mobile-flutter", "lib");

function w(rel, c) {
  const p = path.join(LIB, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, c);
}

const info = [
  ["more/help_center_screen.dart", "HelpCenterScreen", "featureHelp", "featureHelpBody"],
  ["more/safety_tips_screen.dart", "SafetyTipsScreen", "featureSafety", "featureSafetyBody"],
  ["more/about_weret_screen.dart", "AboutWeretScreen", "featureAbout", "featureAboutBody"],
  ["more/ride_tips_screen.dart", "RideTipsScreen", "featureRideTips", "featureRideTipsBody"],
  ["more/saved_places_screen.dart", "SavedPlacesScreen", "featureSavedPlaces", "featureSavedPlacesBody"],
  ["more/notification_settings_screen.dart", "NotificationSettingsScreen", "featureNotifications", "featureNotificationsBody"],
  ["more/driver_trip_flow_screen.dart", "DriverTripFlowScreen", "featureDriverTripFlow", "featureDriverTripFlowBody"],
  ["more/driver_earnings_screen.dart", "DriverEarningsScreen", "featureDriverEarningsPage", "featureDriverEarningsBody"],
  ["more/driver_demand_screen.dart", "DriverDemandScreen", "featureDriverDemand", "featureDriverDemandBody"],
  ["more/driver_insights_screen.dart", "DriverInsightsScreen", "featureDriverInsights", "featureDriverInsightsBody"],
  ["more/driver_ratings_screen.dart", "DriverRatingsScreen", "featureDriverRatings", "featureDriverRatingsBody"],
  ["more/driver_vehicle_screen.dart", "DriverVehicleScreen", "featureDriverVehicle", "featureDriverVehicleBody"],
  ["more/admin_tools_screen.dart", "AdminToolsScreen", "adminTools", "adminToolsHint"],
];

for (const [rel, cls, title, body] of info) {
  w(rel, `import 'package:easy_localization/easy_localization.dart';
import '../../shared/widgets/weret_info_screen.dart';
class ${cls} extends StatelessWidget {
  const ${cls}({super.key});
  @override
  Widget build(BuildContext context) => WeretInfoScreen(title: '${title}'.tr(), body: '${body}'.tr());
}
`);
}

w("features/wallet/wallet_overview_screen.dart", `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/wallet_provider.dart';
import '../../shared/widgets/custom_button.dart';

class WalletOverviewScreen extends ConsumerStatefulWidget {
  const WalletOverviewScreen({super.key});
  @override
  ConsumerState<WalletOverviewScreen> createState() => _WalletOverviewScreenState();
}
class _WalletOverviewScreenState extends ConsumerState<WalletOverviewScreen> {
  @override void initState() { super.initState(); Future.microtask(() => ref.read(walletProvider.notifier).refresh()); }
  @override
  Widget build(BuildContext context) {
    final w = ref.watch(walletProvider);
    return Scaffold(
      appBar: AppBar(title: Text('walletTitle'.tr())),
      body: RefreshIndicator(
        onRefresh: () => ref.read(walletProvider.notifier).refresh(),
        child: ListView(padding: const EdgeInsets.all(16), children: [
          Text('\${'walletBalance'.tr()}: \${w.totalBalance}', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 16),
          CustomButton(title: 'walletAddMoney'.tr(), onPressed: () => context.push('/passenger/more/wallet/deposit')),
          CustomButton(title: 'walletWithdraw'.tr(), variant: 'outline', onPressed: () => context.push('/passenger/more/wallet/withdraw')),
          CustomButton(title: 'walletHistory'.tr(), variant: 'outline', onPressed: () => context.push('/passenger/more/wallet/history')),
          const Divider(),
          ...w.accounts.map((a) => ListTile(title: Text('\${a['walletType']}'), subtitle: Text('\${a['balance'] ?? 0}'))),
        ]),
      ),
    );
  }
}
`);

w("features/wallet/wallet_deposit_screen.dart", `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../core/providers/wallet_provider.dart';
import '../../shared/widgets/custom_button.dart';

class WalletDepositScreen extends ConsumerStatefulWidget {
  const WalletDepositScreen({super.key});
  @override
  ConsumerState<WalletDepositScreen> createState() => _WalletDepositScreenState();
}
class _WalletDepositScreenState extends ConsumerState<WalletDepositScreen> {
  final _amount = TextEditingController(text: '100');
  String? _accountId;
  @override void initState() { super.initState(); Future.microtask(() async { await ref.read(walletProvider.notifier).fetchAccounts(); final a = ref.read(walletProvider).accounts; if (a.isNotEmpty) _accountId = '\${a.first['_id']}'; }); }
  @override Widget build(BuildContext context) {
    final accounts = ref.watch(walletProvider).accounts;
    return Scaffold(
      appBar: AppBar(title: Text('walletAddMoney'.tr())),
      body: Padding(padding: const EdgeInsets.all(16), child: Column(children: [
        DropdownButtonFormField<String>(value: _accountId, items: accounts.map((a) => DropdownMenuItem(value: '\${a['_id']}', child: Text('\${a['walletType']}'))).toList(), onChanged: (v) => setState(() => _accountId = v)),
        TextField(controller: _amount, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: 'amount'.tr())),
        CustomButton(title: 'walletAddMoney'.tr(), onPressed: _accountId == null ? null : () => ref.read(walletProvider.notifier).deposit(_accountId!, num.tryParse(_amount.text) ?? 0)),
      ])),
    );
  }
}
`);

w("features/auth/admin_dashboard_screen.dart", `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../core/providers/ride_provider.dart';

class AdminDashboardScreen extends ConsumerStatefulWidget {
  const AdminDashboardScreen({super.key});
  @override
  ConsumerState<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}
class _AdminDashboardScreenState extends ConsumerState<AdminDashboardScreen> {
  @override void initState() { super.initState(); Future.microtask(() => ref.read(rideProvider.notifier).fetchAdminStats()); }
  @override Widget build(BuildContext context) {
    final stats = ref.watch(rideProvider).adminStats ?? {};
    return Scaffold(
      appBar: AppBar(title: Text('adminDashboard'.tr())),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        _tile('totalUsers'.tr(), '\${stats['totalUsers'] ?? '—'}'),
        _tile('totalRides'.tr(), '\${stats['totalRides'] ?? '—'}'),
        _tile('driversOnline'.tr(), '\${stats['driversOnline'] ?? '—'}'),
        _tile('activeRides'.tr(), '\${stats['activeRides'] ?? '—'}'),
      ]),
    );
  }
  Widget _tile(String l, String v) => Card(child: ListTile(title: Text(l), trailing: Text(v, style: const TextStyle(fontWeight: FontWeight.bold))));
}
`);

w("features/auth/ride_chat_screen.dart", `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../core/providers/ride_provider.dart';

class RideChatScreen extends ConsumerStatefulWidget {
  const RideChatScreen({super.key, required this.rideId});
  final String rideId;
  @override
  ConsumerState<RideChatScreen> createState() => _RideChatScreenState();
}
class _RideChatScreenState extends ConsumerState<RideChatScreen> {
  List<dynamic> _messages = [];
  final _input = TextEditingController();
  @override void initState() { super.initState(); _load(); }
  Future<void> _load() async { final m = await ref.read(rideProvider.notifier).fetchMessages(widget.rideId); setState(() => _messages = m); }
  Future<void> _send() async {
    if (_input.text.trim().isEmpty) return;
    await ref.read(rideProvider.notifier).sendMessage(widget.rideId, _input.text.trim());
    _input.clear();
    await _load();
  }
  @override Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('rideChat'.tr())),
      body: Column(children: [
        Expanded(child: ListView.builder(itemCount: _messages.length, itemBuilder: (c,i) { final m = _messages[i] as Map; return ListTile(title: Text('\${m['text']}'), subtitle: Text('\${m['senderId'] ?? ''}')); })),
        Padding(padding: const EdgeInsets.all(8), child: Row(children: [
          Expanded(child: TextField(controller: _input, decoration: InputDecoration(hintText: 'typeMessage'.tr()))),
          IconButton(onPressed: _send, icon: const Icon(Icons.send)),
        ])),
      ]),
    );
  }
}
`);

console.log("Generated remaining screens");
