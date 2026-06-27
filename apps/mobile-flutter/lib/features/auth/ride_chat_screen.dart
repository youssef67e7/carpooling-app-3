import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';

import '../../core/providers/auth_provider.dart';
import '../../core/providers/ride_provider.dart';
import '../../core/theme/weret_tokens.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/weret_ambient_background.dart';
import '../../shared/widgets/ui/pressable_scale.dart';

const _pad = 16.0;
const _sm = 8.0;
const _bubbleRadius = 16.0;

class RideChatScreen extends ConsumerStatefulWidget {
  const RideChatScreen({super.key, required this.rideId});
  final String rideId;

  @override
  ConsumerState<RideChatScreen> createState() => _RideChatScreenState();
}

class _RideChatScreenState extends ConsumerState<RideChatScreen> {
  List<dynamic> _messages = [];
  bool _loadingMore = false;
  bool _hasMore = true;
  String? _sendError;
  final _input = TextEditingController();
  final _scrollController = ScrollController();
  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
    _pollTimer = Timer.periodic(const Duration(seconds: 10), (_) => _load());
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _input.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels > 100) return;
    if (_loadingMore || !_hasMore) return;
    _loadMore();
  }

  Future<void> _load() async {
    try {
      final m = await ref.read(rideProvider.notifier).fetchMessages(widget.rideId);
      if (mounted) setState(() => _messages = m);
    } catch (_) {}
  }

  Future<void> _loadMore() async {
    if (_messages.isEmpty) return;
    _loadingMore = true;
    try {
      final first = _messages.first;
      final createdAt = first is Map ? '${first['createdAt'] ?? first['created_at']}' : '';
      if (createdAt.isEmpty) { _loadingMore = false; return; }
      final older = await ref.read(rideProvider.notifier).fetchMessages(widget.rideId, before: createdAt);
      if (mounted) {
        setState(() {
          _messages = [...older, ..._messages];
          _hasMore = older.length >= 30;
        });
      }
    } catch (_) {
      _hasMore = false;
    } finally {
      _loadingMore = false;
    }
  }

  Future<void> _send() async {
    final text = _input.text.trim();
    if (text.isEmpty) return;
    HapticFeedback.mediumImpact();
    _input.clear();
    setState(() => _sendError = null);
    try {
      await ref.read(rideProvider.notifier).sendMessage(widget.rideId, text);
      await _load();
    } catch (e) {
      if (mounted) setState(() => _sendError = '$e');
    }
  }

  String _extractSenderId(dynamic msg) {
    if (msg is! Map) return '';
    final sid = msg['senderId'];
    if (sid is Map) return '${sid['_id'] ?? ''}';
    return '$sid';
  }

  @override
  Widget build(BuildContext context) {
    final currentUserId = ref.read(authProvider).user?.id ?? '';

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
                  ? const EmptyState(
                      icon: Icons.chat_outlined,
                      title: 'No messages yet',
                      subtitle: 'Start a conversation with your driver',
                    )
                  : ListView.builder(
                      controller: _scrollController,
                      padding: const EdgeInsets.all(_pad),
                      itemCount: _messages.length + (_hasMore ? 1 : 0),
                      itemBuilder: (c, i) {
                        if (i == 0 && _hasMore) {
                          return const Padding(
                            padding: EdgeInsets.symmetric(vertical: _sm),
                            child: Center(child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))),
                          );
                        }
                        final idx = _hasMore ? i - 1 : i;
                        final m = _messages[idx];
                        if (m is! Map) return const SizedBox.shrink();
                        final text = '${m['text'] ?? ''}';
                        final senderId = _extractSenderId(m);
                        final isMine = senderId.isNotEmpty && senderId == currentUserId;

                        return _ChatBubble(text: text, isMine: isMine);
                      },
                    ),
            ),
            _ChatInputBar(
              controller: _input,
              onSend: _send,
              error: _sendError,
            ),
          ],
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Extracted Widgets
// ═══════════════════════════════════════════════════════════════════════

class _ChatBubble extends StatelessWidget {
  const _ChatBubble({required this.text, required this.isMine});
  final String text;
  final bool isMine;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: isMine ? AlignmentDirectional.centerEnd : AlignmentDirectional.centerStart,
      child: Container(
        margin: const EdgeInsets.only(bottom: _sm),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isMine ? WeretTokens.brand.withValues(alpha: 0.15) : WeretTokens.surface,
          borderRadius: BorderRadius.circular(_bubbleRadius),
          border: Border.all(color: WeretTokens.border.withValues(alpha: 0.7)),
        ),
        child: Text(text, style: const TextStyle(fontWeight: FontWeight.w500)),
      ),
    );
  }
}

class _ChatInputBar extends StatelessWidget {
  const _ChatInputBar({
    required this.controller,
    required this.onSend,
    this.error,
  });
  final TextEditingController controller;
  final VoidCallback onSend;
  final String? error;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (error != null)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: _pad, vertical: _sm - 4),
            child: Text(error!, style: const TextStyle(color: WeretTokens.error, fontSize: 12)),
          ),
        Container(
          padding: const EdgeInsets.fromLTRB(12, _sm, 12, 12),
          decoration: BoxDecoration(
            color: WeretTokens.surface,
            border: Border(top: BorderSide(color: WeretTokens.border.withValues(alpha: 0.6))),
          ),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: controller,
                  decoration: InputDecoration(hintText: 'rideChatPlaceholder'.tr(), isDense: true),
                  onSubmitted: (_) => onSend(),
                ),
              ),
              const SizedBox(width: _sm),
              PressableScale(
                scale: 0.9,
                haptic: true,
                onTap: onSend,
                child: Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: WeretTokens.brand,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.send, size: 18, color: Colors.white),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
