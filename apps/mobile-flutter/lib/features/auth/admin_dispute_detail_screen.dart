import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/theme/weret_tokens.dart';
import '../../core/utils/show_alert.dart';
import '../../shared/widgets/error_state.dart';
import '../../shared/widgets/ui/pressable_scale.dart';
import '../../shared/widgets/ui/section_surface.dart';

const _pad = 16.0;
const _sm = 8.0;

class AdminDisputeDetailScreen extends ConsumerStatefulWidget {
  const AdminDisputeDetailScreen({super.key, required this.disputeId});
  final String disputeId;
  @override
  ConsumerState<AdminDisputeDetailScreen> createState() => _AdminDisputeDetailScreenState();
}

class _AdminDisputeDetailScreenState extends ConsumerState<AdminDisputeDetailScreen> {
  Map<String, dynamic>? _dispute;
  List<Map<String, dynamic>> _messages = [];
  bool _loading = true;
  String? _error;
  final _msgCtrl = TextEditingController();
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _msgCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    HapticFeedback.mediumImpact();
    setState(() => _loading = true);
    try {
      final api = await ref.read(apiClientProvider.future);
      final data = await api.getJson(ApiEndpoints.disputesAdminDetail(widget.disputeId));
      setState(() {
        _dispute = Map<String, dynamic>.from(data['dispute'] as Map);
        _messages = (data['messages'] as List? ?? []).map((e) => Map<String, dynamic>.from(e as Map)).toList();
        _loading = false;
      });
    } catch (e) {
      setState(() { _error = '$e'; _loading = false; });
    }
  }

  Future<void> _sendMessage() async {
    final text = _msgCtrl.text.trim();
    if (text.isEmpty) return;
    HapticFeedback.mediumImpact();
    setState(() => _sending = true);
    try {
      final api = await ref.read(apiClientProvider.future);
      final data = await api.postJson(ApiEndpoints.disputeMessages(widget.disputeId), {'text': text});
      final msg = Map<String, dynamic>.from((data['message'] as Map));
      setState(() { _messages.add(msg); _msgCtrl.clear(); _sending = false; });
    } catch (e) {
      setState(() => _sending = false);
      if (mounted) showAlert(context, 'error', '$e');
    }
  }

  Future<void> _updateStatus(String status) async {
    HapticFeedback.mediumImpact();
    try {
      final api = await ref.read(apiClientProvider.future);
      await api.putJson(ApiEndpoints.disputesAdminStatus(widget.disputeId), {'status': status});
      await _load();
    } catch (e) {
      if (mounted) showAlert(context, 'error', '$e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WeretTokens.bg,
      appBar: AppBar(
        title: Text('Dispute #${widget.disputeId.length > 8 ? widget.disputeId.substring(0, 8) : widget.disputeId}'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          PopupMenuButton<String>(
            onSelected: _updateStatus,
            itemBuilder: (_) => ['reviewing', 'resolved', 'dismissed'].map((s) => PopupMenuItem(value: s, child: Text(s))).toList(),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(_pad),
                    child: ErrorState(message: _error!, onRetry: _load),
                  ),
                )
              : Column(
                  children: [
                    if (_dispute != null)
                      Padding(
                        padding: const EdgeInsets.fromLTRB(_pad, _pad, _pad, 0),
                        child: _DisputeHeaderCard(dispute: _dispute!),
                      ),
                    Expanded(
                      child: ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: _pad),
                        itemCount: _messages.length,
                        itemBuilder: (_, i) {
                          final m = _messages[i];
                          final sender = m['senderId'] is Map ? '${(m['senderId'] as Map)['name'] ?? ''}' : '';
                          final isAdmin = m['senderId'] is Map && '${(m['senderId'] as Map)['role'] ?? ''}' == 'admin';
                          return _DisputeBubble(
                            text: '${m['text'] ?? ''}',
                            sender: sender,
                            isAdmin: isAdmin,
                          );
                        },
                      ),
                    ),
                    _DisputeInput(
                      controller: _msgCtrl,
                      sending: _sending,
                      onSend: _sendMessage,
                    ),
                  ],
                ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Extracted Widgets
// ═══════════════════════════════════════════════════════════════════════

class _DisputeHeaderCard extends StatelessWidget {
  const _DisputeHeaderCard({required this.dispute});
  final Map<String, dynamic> dispute;

  @override
  Widget build(BuildContext context) {
    return SectionSurface(
      padding: const EdgeInsets.all(_pad),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Chip(label: Text('${dispute['status'] ?? ''}'), backgroundColor: WeretTokens.infoSoft),
            const Spacer(),
            Text('Reason: ${dispute['reason'] ?? ''}', style: TextStyle(color: WeretTokens.textMuted, fontSize: 12)),
          ]),
          const SizedBox(height: _sm),
          Text('${dispute['description'] ?? ''}', style: TextStyle(color: WeretTokens.textSecondary)),
          if (dispute['adminNote'] != null) ...[
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.all(_sm),
              decoration: BoxDecoration(color: WeretTokens.bg, borderRadius: BorderRadius.circular(_sm)),
              child: Text('Admin note: ${dispute['adminNote']}', style: TextStyle(color: WeretTokens.textMuted, fontSize: 12)),
            ),
          ],
        ],
      ),
    );
  }
}

class _DisputeBubble extends StatelessWidget {
  const _DisputeBubble({
    required this.text,
    required this.sender,
    required this.isAdmin,
  });
  final String text;
  final String sender;
  final bool isAdmin;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: _sm),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isAdmin ? WeretTokens.brand.withValues(alpha: 0.08) : WeretTokens.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isAdmin ? WeretTokens.brand.withValues(alpha: 0.2) : WeretTokens.borderSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (sender.isNotEmpty)
            Text(sender, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: isAdmin ? WeretTokens.brand : WeretTokens.textMuted)),
          if (sender.isNotEmpty) const SizedBox(height: 4),
          Text(text, style: TextStyle(color: WeretTokens.textPrimary)),
        ],
      ),
    );
  }
}

class _DisputeInput extends StatelessWidget {
  const _DisputeInput({
    required this.controller,
    required this.sending,
    required this.onSend,
  });
  final TextEditingController controller;
  final bool sending;
  final VoidCallback onSend;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(_pad, _sm, _pad, 24),
      decoration: BoxDecoration(color: WeretTokens.surface, border: Border(top: BorderSide(color: WeretTokens.borderSubtle))),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: controller,
              decoration: InputDecoration(
                hintText: 'Type a message…',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                contentPadding: const EdgeInsets.symmetric(horizontal: _pad, vertical: 12),
              ),
            ),
          ),
          const SizedBox(width: _sm),
          PressableScale(
            scale: 0.9,
            haptic: true,
            enabled: !sending,
            onTap: sending ? null : onSend,
            child: Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: sending ? WeretTokens.border : WeretTokens.brand,
                borderRadius: BorderRadius.circular(12),
              ),
              child: sending
                  ? const Center(child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)))
                  : const Icon(Icons.send, size: 18, color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }
}
