import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/weret_tokens.dart';
import '../../core/utils/api_error_message.dart';
import 'safety_provider.dart';

class BlockUserScreen extends ConsumerStatefulWidget {
  const BlockUserScreen({super.key});
  static const routePath = '/safety/blocked';

  @override
  ConsumerState<BlockUserScreen> createState() => _BlockUserScreenState();
}

class _BlockUserScreenState extends ConsumerState<BlockUserScreen> {
  List<BlockedUser> _blocked = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final svc = ref.read(safetyServiceProvider);
    final blocked = await svc.getBlockedUsers();
    if (mounted) setState(() { _blocked = blocked; _loading = false; });
  }

  Future<void> _unblock(BlockedUser b) async {
    try {
      await ref.read(safetyServiceProvider).unblockUser(b.userId);
      await _load();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(localizedApiError(e))));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WeretTokens.bg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text('blockedTitle'.tr(), style: const TextStyle(fontWeight: FontWeight.w700)),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _blocked.isEmpty
              ? Center(child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.block, size: 64, color: WeretTokens.textMuted),
                    const SizedBox(height: 16),
                    Text('blockedEmpty'.tr(), style: TextStyle(color: WeretTokens.textSecondary)),
                  ],
                ))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: _blocked.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (_, i) {
                      final b = _blocked[i];
                      final name = b.user != null ? '${b.user!['name'] ?? 'Unknown'}' : 'Unknown';
                      return ListTile(
                        leading: CircleAvatar(
                          backgroundImage: (b.user?['profileImageUrl'] as String? ?? '').isNotEmpty
                              ? NetworkImage('${b.user!['profileImageUrl']}')
                              : null,
                          child: (b.user?['profileImageUrl'] as String? ?? '').isEmpty
                              ? Text(name.isNotEmpty ? name[0].toUpperCase() : '?')
                              : null,
                        ),
                        title: Text(name, style: const TextStyle(fontWeight: FontWeight.w600)),
                        subtitle: Text(b.user?['role']?.toString() ?? ''),
                        trailing: TextButton(
                          onPressed: () => _unblock(b),
                          child: Text('blockedUnblock'.tr(), style: const TextStyle(color: WeretTokens.brand)),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
