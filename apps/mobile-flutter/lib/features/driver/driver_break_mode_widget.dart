import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/theme/weret_tokens.dart';

class DriverBreakModeWidget extends ConsumerStatefulWidget {
  const DriverBreakModeWidget({super.key});
  @override
  ConsumerState<DriverBreakModeWidget> createState() => _DriverBreakModeWidgetState();
}

class _DriverBreakModeWidgetState extends ConsumerState<DriverBreakModeWidget> {
  int _selectedMinutes = 30;

  Future<void> _toggleBreak() async {
    final api = await ref.read(apiClientProvider.future);
    await api.postJson(ApiEndpoints.driverBreakMode, {'durationMinutes': _selectedMinutes});
    if (mounted) Navigator.of(context).pop();
  }

  Future<void> _endBreak() async {
    final api = await ref.read(apiClientProvider.future);
    await api.postJson(ApiEndpoints.driverBreakMode, {});
    if (mounted) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2))),
          const SizedBox(height: 20),
          Text('Take a Break', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: WeretTokens.textPrimary)),
          const SizedBox(height: 6),
          Text('Pause new ride requests for a while', style: TextStyle(color: WeretTokens.textMuted, fontSize: 14)),
          const SizedBox(height: 24),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [15, 30, 45, 60, 120].map((m) => ChoiceChip(
              label: Text(m >= 60 ? '${m ~/ 60}h' : '${m}m'),
              selected: _selectedMinutes == m,
              onSelected: (_) => setState(() => _selectedMinutes = m),
            )).toList(),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: FilledButton(
              onPressed: _toggleBreak,
              style: FilledButton.styleFrom(backgroundColor: WeretTokens.brand),
              child: Text('Start Break'.tr(), style: const TextStyle(fontWeight: FontWeight.w700)),
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: TextButton(
              onPressed: _endBreak,
              child: Text('End Break'.tr(), style: const TextStyle(color: WeretTokens.textSecondary)),
            ),
          ),
        ],
      ),
    );
  }
}
