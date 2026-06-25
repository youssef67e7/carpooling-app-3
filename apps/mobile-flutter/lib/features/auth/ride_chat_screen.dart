import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../core/providers/ride_provider.dart';
import '../../core/theme/weret_tokens.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/weret_ambient_background.dart';

class RideChatScreen extends ConsumerStatefulWidget {
  const RideChatScreen({super.key, required this.rideId});
  final String rideId;

  @override
  ConsumerState<RideChatScreen> createState() => _RideChatScreenState();
}

class _RideChatScreenState extends ConsumerState<RideChatScreen> {
  List<dynamic> _messages = [];
  final _input = TextEditingController();

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  @override
  void dispose() {
    _input.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final m = await ref.read(rideProvider.notifier).fetchMessages(widget.rideId);
    if (mounted) setState(() => _messages = m);
  }

  Future<void> _send() async {
    final text = _input.text.trim();
    if (text.isEmpty) return;
    await ref.read(rideProvider.notifier).sendMessage(widget.rideId, text);
    _input.clear();
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WeretTokens.bg,
      appBar: AppBar(
        title: Text('rideChatTitle'.tr(), style: const TextStyle(fontWeight: FontWeight.w700)),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
      ),
      body: WeretAmbientBackground(
        child: Column(
          children: [
            Expanded(
              child: _messages.isEmpty
                  ? const EmptyState(icon: Icons.chat_outlined, title: 'noMessages', subtitle: 'startConversation')
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _messages.length,
                      itemBuilder: (c, i) {
                        final m = _messages[i] as Map<String, dynamic>;
                        return Align(
                          alignment: AlignmentDirectional.centerStart,
                          child: Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                            decoration: BoxDecoration(
                              color: WeretTokens.surface,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: WeretTokens.border.withValues(alpha: 0.7)),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('${m['text']}', style: const TextStyle(fontWeight: FontWeight.w500)),
                                const SizedBox(height: 4),
                                Text('${m['senderId'] ?? ''}', style: const TextStyle(fontSize: 11, color: WeretTokens.textSecondary)),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
            Container(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
              decoration: BoxDecoration(
                color: WeretTokens.surface,
                border: Border(top: BorderSide(color: WeretTokens.border.withValues(alpha: 0.6))),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _input,
                      decoration: InputDecoration(hintText: 'rideChatPlaceholder'.tr(), isDense: true),
                      onSubmitted: (_) => _send(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  FilledButton(onPressed: _send, child: const Icon(Icons.send, size: 18)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
