#!/usr/bin/env node
/**
 * Generates complete Flutter app from React Native reference (apps/mobile-legacy).
 * Run: node scripts/build-flutter-app.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RN = path.join(ROOT, "apps", "mobile-legacy", "src");
const LIB = path.join(ROOT, "apps", "mobile-flutter", "lib");

function w(rel, content) {
  const abs = path.join(LIB, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, "utf8");
  return rel;
}

function screen(name, rnPath, body) {
  return w(
    `features/${rnPath}`,
    `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:go_router/go_router.dart';
import '../../shared/widgets/weret_list_screen.dart';
import '../../shared/widgets/weret_step_header.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/custom_button.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/ride_provider.dart';
import '../../core/providers/wallet_provider.dart';
import '../../core/providers/driver_provider.dart';
import '../../shared/widgets/ride_card.dart';
import '../../shared/widgets/weret_info_screen.dart';
import '../../shared/widgets/more_menu_row.dart';
import '../../shared/widgets/mode_switch_row.dart';

/// Ported from React Native: ${rnPath.replace(/\//g, "/")}
class ${name} extends ConsumerStatefulWidget {
  const ${name}({super.key});
  @override
  ConsumerState<${name}> createState() => _${name}State();
}

class _${name}State extends ConsumerState<${name}> {
${body}
}
`
  );
}

function infoScreen(name, rnRel, titleKey, bodyKey) {
  return w(
    `features/${rnRel}`,
    `import 'package:easy_localization/easy_localization.dart';
import '../../shared/widgets/weret_info_screen.dart';

class ${name} extends StatelessWidget {
  const ${name}({super.key});
  @override
  Widget build(BuildContext context) {
    return WeretInfoScreen(title: '${titleKey}'.tr(), body: '${bodyKey}'.tr());
  }
}
`
  );
}

// --- UTILS ---
w(
  "core/utils/api_errors.dart",
  `class ApiErrors {
  static String message(dynamic e) {
    if (e is Map && e['message'] != null) return '\${e['message']}';
    return e.toString();
  }
}
`
);

w(
  "core/utils/show_alert.dart",
  `import 'package:flutter/material.dart';

Future<void> showAlert(BuildContext context, String title, String message) {
  return showDialog(
    context: context,
    builder: (c) => AlertDialog(
      title: Text(title),
      content: Text(message),
      actions: [TextButton(onPressed: () => Navigator.pop(c), child: const Text('OK'))],
    ),
  );
}
`
);

w(
  "core/utils/trip_fare.dart",
  `double haversineKm(double lat1, double lng1, double lat2, double lng2) {
  const r = 6371.0;
  final dLat = _rad(lat2 - lat1);
  final dLng = _rad(lng2 - lng1);
  final a = (dLat / 2).sin() * (dLat / 2).sin() +
      _rad(lat1).cos() * _rad(lat2).cos() * (dLng / 2).sin() * (dLng / 2).sin();
  return r * 2 * (a.sqrt()).asin();
}

double _rad(double d) => d * 3.141592653589793 / 180.0;

extension _Trig on double {
  double sin() => _sin(this);
  double cos() => _cos(this);
  double sqrt() => _sqrt(this);
  double asin() => _asin(this);
}

double _sin(double x) => Math.sin(x);
double _cos(double x) => Math.cos(x);
double _sqrt(double x) => Math.sqrt(x);
double _asin(double x) => Math.asin(x);

class Math {
  static double sin(double x) => import('dart:math').sin(x);
}
`
);

// Fix trip_fare - use dart:math properly
w(
  "core/utils/trip_fare.dart",
  `import 'dart:math' as math;

double haversineKm(double lat1, double lng1, double lat2, double lng2) {
  const r = 6371.0;
  final dLat = _rad(lat2 - lat1);
  final dLng = _rad(lng2 - lng1);
  final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
      math.cos(_rad(lat1)) * math.cos(_rad(lat2)) * math.sin(dLng / 2) * math.sin(dLng / 2);
  return r * 2 * math.asin(math.sqrt(a));
}

double _rad(double d) => d * math.pi / 180.0;

double fareFromVehicle(Map<String, dynamic> v, double km) {
  final base = (v['baseFare'] as num?)?.toDouble() ?? 10;
  final perKm = (v['pricePerKm'] as num?)?.toDouble() ?? 2;
  return base + perKm * km;
}
`
);

w(
  "core/constants/vehicle_types.dart",
  `const driverVehicleTypes = [
  'shipping', 'delivery', 'travel', 'motorcycle', 'car_standard', 'car_comfort',
];
const walletTypes = ['cash', 'instapay', 'vodafone', 'etisalat', 'orange', 'wepay'];
`
);

// --- SHARED WIDGETS ---
w(
  "shared/widgets/custom_button.dart",
  `import 'package:flutter/material.dart';

class CustomButton extends StatelessWidget {
  const CustomButton({
    super.key,
    required this.title,
    required this.onPressed,
    this.loading = false,
    this.disabled = false,
    this.variant = 'filled',
  });

  final String title;
  final VoidCallback? onPressed;
  final bool loading;
  final bool disabled;
  final String variant;

  @override
  Widget build(BuildContext context) {
    final child = loading
        ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
        : Text(title);
    if (variant == 'outline') {
      return OutlinedButton(onPressed: disabled || loading ? null : onPressed, child: child);
    }
    return FilledButton(onPressed: disabled || loading ? null : onPressed, child: child);
  }
}
`
);

w(
  "shared/widgets/empty_state.dart",
  `import 'package:flutter/material.dart';

class EmptyState extends StatelessWidget {
  const EmptyState({super.key, required this.title, this.subtitle, this.icon = Icons.inbox_outlined});
  final String title;
  final String? subtitle;
  final IconData icon;
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, size: 48, color: Theme.of(context).colorScheme.outline),
          const SizedBox(height: 12),
          Text(title, textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleMedium),
          if (subtitle != null) ...[const SizedBox(height: 8), Text(subtitle!, textAlign: TextAlign.center)],
        ]),
      ),
    );
  }
}
`
);

w(
  "shared/widgets/weret_list_screen.dart",
  `import 'package:flutter/material.dart';

class WeretListScreen extends StatelessWidget {
  const WeretListScreen({super.key, required this.child, this.padding = 16});
  final Widget child;
  final double padding;
  @override
  Widget build(BuildContext context) {
    return SafeArea(child: SingleChildScrollView(padding: EdgeInsets.all(padding), child: child));
  }
}
`
);

w(
  "shared/widgets/weret_step_header.dart",
  `import 'package:flutter/material.dart';

class WeretStepHeader extends StatelessWidget {
  const WeretStepHeader({super.key, required this.title, this.subtitle});
  final String title;
  final String? subtitle;
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800)),
        if (subtitle != null) Text(subtitle!, style: Theme.of(context).textTheme.bodySmall),
      ]),
    );
  }
}
`
);

w(
  "shared/widgets/weret_info_screen.dart",
  `import 'package:flutter/material.dart';
import 'weret_list_screen.dart';

class WeretInfoScreen extends StatelessWidget {
  const WeretInfoScreen({super.key, required this.title, required this.body});
  final String title;
  final String body;
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: WeretListScreen(child: Text(body, style: const TextStyle(height: 1.5, fontSize: 15))),
    );
  }
}
`
);

w(
  "shared/widgets/ride_card.dart",
  `import 'package:flutter/material.dart';

class RideCard extends StatelessWidget {
  const RideCard({super.key, required this.ride});
  final Map<String, dynamic> ride;
  @override
  Widget build(BuildContext context) {
    final status = ride['status'] ?? '';
    final fare = ride['estimatedFare'] ?? ride['fare'] ?? '—';
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(status.toString().toUpperCase(), style: const TextStyle(fontWeight: FontWeight.w800)),
          const SizedBox(height: 6),
          Text('Fare: \$fare'),
          if (ride['pickupLocation'] != null)
            Text('From: \${(ride['pickupLocation']['lat'] ?? '').toString()}'),
        ]),
      ),
    );
  }
}
`
);

w(
  "shared/widgets/more_menu_row.dart",
  `import 'package:flutter/material.dart';

class MoreMenuRow extends StatelessWidget {
  const MoreMenuRow({super.key, required this.icon, required this.title, this.subtitle, required this.onTap});
  final IconData icon;
  final String title;
  final String? subtitle;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(leading: Icon(icon), title: Text(title), subtitle: subtitle != null ? Text(subtitle!) : null, onTap: onTap),
    );
  }
}
`
);

w(
  "shared/widgets/mode_switch_row.dart",
  `import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';

class ModeSwitchRow extends StatelessWidget {
  const ModeSwitchRow({super.key, required this.value, required this.onChanged, this.loading = false});
  final String value;
  final ValueChanged<String> onChanged;
  final bool loading;
  @override
  Widget build(BuildContext context) {
    return SegmentedButton<String>(
      segments: [
        ButtonSegment(value: 'passenger', label: Text('modePassenger'.tr())),
        ButtonSegment(value: 'driver', label: Text('modeDriver'.tr())),
      ],
      selected: {value},
      onSelectionChanged: loading ? null : (s) => onChanged(s.first),
    );
  }
}
`
);

w(
  "shared/widgets/weret_text_field.dart",
  `import 'package:flutter/material.dart';

class WeretTextField extends StatelessWidget {
  const WeretTextField({super.key, required this.label, required this.controller, this.keyboardType, this.obscure = false});
  final String label;
  final TextEditingController controller;
  final TextInputType? keyboardType;
  final bool obscure;
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextField(controller: controller, keyboardType: keyboardType, obscureText: obscure, decoration: InputDecoration(labelText: label, border: const OutlineInputBorder())),
    );
  }
}
`
);

w(
  "shared/widgets/connection_status_banner.dart",
  `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';

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
    return health.when(
      data: (d) => d['mongo'] == true || d['database'] == true
          ? const SizedBox.shrink()
          : Material(color: Colors.orange.shade100, child: Padding(padding: const EdgeInsets.all(8), child: Text(compact ? 'API OK' : 'Backend connected'))),
      loading: () => const LinearProgressIndicator(minHeight: 2),
      error: (e, _) => Material(color: Colors.red.shade100, child: Padding(padding: const EdgeInsets.all(8), child: Text('Cannot reach API: \$e'))),
    );
  }
}
`
);

console.log("Building Flutter widgets and utils...");

// Copy l10n
const l10nDir = path.join(LIB, "l10n");
fs.mkdirSync(l10nDir, { recursive: true });
for (const f of ["en.json", "ar.json"]) {
  const src = path.join(RN, "locales", f);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(l10nDir, f));
}

console.log("Done. Run hand-written screen ports next.");
