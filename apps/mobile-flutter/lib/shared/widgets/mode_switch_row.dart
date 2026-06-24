import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'weret_pill_toggle.dart';

class ModeSwitchRow extends StatelessWidget {
  const ModeSwitchRow({super.key, required this.value, required this.onChanged, this.loading = false});
  final String value;
  final ValueChanged<String> onChanged;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: WeretPillToggle<String>(
        value: value,
        options: const ['passenger', 'driver'],
        labelBuilder: (v) => v == 'passenger' ? 'modePassenger'.tr() : 'modeDriver'.tr(),
        onChanged: loading ? (_) {} : onChanged,
      ),
    );
  }
}
