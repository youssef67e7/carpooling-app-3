import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/theme/weret_tokens.dart';

class ReportIncidentScreen extends ConsumerStatefulWidget {
  const ReportIncidentScreen({super.key, this.reportedUserId, this.rideId});
  final String? reportedUserId;
  final String? rideId;
  static const routePath = '/safety/report';

  @override
  ConsumerState<ReportIncidentScreen> createState() => _ReportIncidentScreenState();
}

class _ReportIncidentScreenState extends ConsumerState<ReportIncidentScreen> {
  final _reasonCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _sending = false;

  static const _reasons = [
    'Harassment',
    'Inappropriate behavior',
    'Unsafe driving',
    'Vehicle not as described',
    'Route deviation',
    'Overcharging',
    'Fake account',
    'Other',
  ];

  String? _selectedReason;

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedReason == null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('reportReasonRequired'.tr())));
      return;
    }
    setState(() => _sending = true);
    try {
      final api = await ref.read(apiClientProvider.future);
      await api.postJson(ApiEndpoints.reports, {
        'reportedUserId': widget.reportedUserId,
        'reason': _selectedReason,
        'description': _descCtrl.text.trim(),
        if (widget.rideId != null) 'rideId': widget.rideId,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('reportSubmitted'.tr())));
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('reportFailed'.tr())));
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  void dispose() {
    _reasonCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WeretTokens.bg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text('reportIncidentTitle'.tr(), style: const TextStyle(fontWeight: FontWeight.w700)),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            Text('reportIncidentBody'.tr(), style: TextStyle(color: WeretTokens.textSecondary, height: 1.4)),
            const SizedBox(height: 24),
            Text('reportReasonLabel'.tr(), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              value: _selectedReason,
              decoration: InputDecoration(
                filled: true,
                fillColor: WeretTokens.inputFill,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                hintText: 'reportReasonHint'.tr(),
              ),
              items: _reasons.map((r) => DropdownMenuItem(value: r, child: Text(r))).toList(),
              onChanged: (v) => setState(() => _selectedReason = v),
            ),
            const SizedBox(height: 20),
            Text('reportDescriptionLabel'.tr(), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
            const SizedBox(height: 8),
            TextFormField(
              controller: _descCtrl,
              maxLines: 5,
              maxLength: 2000,
              decoration: InputDecoration(
                filled: true,
                fillColor: WeretTokens.inputFill,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                hintText: 'reportDescriptionHint'.tr(),
              ),
              validator: (v) => (v?.trim().length ?? 0) < 10 ? 'Please describe in detail (min 10 chars)' : null,
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _sending ? null : _submit,
              style: ElevatedButton.styleFrom(
                backgroundColor: WeretTokens.error,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: _sending
                  ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Text('submit'.tr(), style: const TextStyle(fontWeight: FontWeight.w700)),
            ),
          ],
        ),
      ),
    );
  }
}
