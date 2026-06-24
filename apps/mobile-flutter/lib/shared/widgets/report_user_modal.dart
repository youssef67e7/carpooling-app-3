import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/ride_provider.dart';
import '../../core/theme/weret_tokens.dart';

const _reportReasons = ['safety', 'harassment', 'fraud', 'other'];

Future<bool?> showReportUserModal(
  BuildContext context,
  WidgetRef ref, {
  required String reportedUserId,
  String? rideId,
  String? reportedName,
}) {
  return showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    backgroundColor: WeretTokens.surface,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(WeretTokens.cardRadius)),
    ),
    builder: (_) => _ReportUserSheet(
      reportedUserId: reportedUserId,
      rideId: rideId,
      reportedName: reportedName,
    ),
  );
}

class _ReportUserSheet extends ConsumerStatefulWidget {
  const _ReportUserSheet({
    required this.reportedUserId,
    this.rideId,
    this.reportedName,
  });

  final String reportedUserId;
  final String? rideId;
  final String? reportedName;

  @override
  ConsumerState<_ReportUserSheet> createState() => _ReportUserSheetState();
}

class _ReportUserSheetState extends ConsumerState<_ReportUserSheet> {
  String _reason = 'safety';
  bool _loading = false;
  final _descCtrl = TextEditingController();

  @override
  void dispose() {
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final desc = _descCtrl.text.trim();
    if (desc.length < 8) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('reportDescribeRequired'.tr())),
      );
      return;
    }
    setState(() => _loading = true);
    try {
      await ref.read(rideProvider.notifier).submitReport({
        'reportedUserId': widget.reportedUserId,
        'reason': _reason,
        'description': desc,
        if (widget.rideId != null) 'rideId': widget.rideId,
      });
      if (!mounted) return;
      Navigator.pop(context, true);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('reportSubmit'.tr())),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$e')),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('reportUserTitle'.tr(), style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 20)),
          if (widget.reportedName != null) ...[
            const SizedBox(height: 6),
            Text(widget.reportedName!, style: const TextStyle(color: WeretTokens.textSecondary)),
          ],
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            initialValue: _reason,
            decoration: InputDecoration(
              labelText: 'reportReasonLabel'.tr(),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
            items: _reportReasons
                .map((r) => DropdownMenuItem(value: r, child: Text('reportReason_$r'.tr())))
                .toList(),
            onChanged: (v) {
              if (v != null) setState(() => _reason = v);
            },
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _descCtrl,
            maxLines: 4,
            maxLength: 500,
            decoration: InputDecoration(
              labelText: 'reportDescriptionLabel'.tr(),
              hintText: 'reportDescriptionPh'.tr(),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
          const SizedBox(height: 8),
          FilledButton(
            onPressed: _loading ? null : _submit,
            child: _loading
                ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                : Text('reportSubmit'.tr()),
          ),
        ],
      ),
    );
  }
}

/// Legacy export kept for imports that expect a widget class.
class ReportUserModal extends StatelessWidget {
  const ReportUserModal({super.key});
  @override
  Widget build(BuildContext context) => const SizedBox.shrink();
}
