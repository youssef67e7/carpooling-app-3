import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/weret_tokens.dart';
import 'safety_provider.dart';

class TrustedContactsScreen extends ConsumerStatefulWidget {
  const TrustedContactsScreen({super.key});
  static const routePath = '/safety/trusted-contacts';

  @override
  ConsumerState<TrustedContactsScreen> createState() => _TrustedContactsScreenState();
}

class _TrustedContactsScreenState extends ConsumerState<TrustedContactsScreen> {
  List<TrustedContact> _contacts = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final svc = ref.read(safetyServiceProvider);
    final contacts = await svc.getTrustedContacts();
    if (mounted) setState(() { _contacts = contacts; _loading = false; });
  }

  Future<void> _add() async {
    final nameCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final relationCtrl = TextEditingController();
    final formKey = GlobalKey<FormState>();
    final added = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          left: 24, right: 24, top: 24,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
        ),
        child: Form(
          key: formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('trustedAddTitle'.tr(), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
              const SizedBox(height: 20),
              TextFormField(controller: nameCtrl, decoration: InputDecoration(labelText: 'name'.tr()), validator: (v) => v?.trim().isEmpty ?? true ? 'Required' : null),
              const SizedBox(height: 12),
              TextFormField(controller: phoneCtrl, decoration: InputDecoration(labelText: 'phone'.tr()), keyboardType: TextInputType.phone, validator: (v) => (v?.trim().length ?? 0) < 6 ? 'Invalid phone' : null),
              const SizedBox(height: 12),
              TextFormField(controller: relationCtrl, decoration: InputDecoration(labelText: 'trustedRelation'.tr())),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: () {
                  if (!formKey.currentState!.validate()) return;
                  Navigator.of(ctx).pop(true);
                },
                style: ElevatedButton.styleFrom(backgroundColor: WeretTokens.brand, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 16)),
                child: Text('save'.tr()),
              ),
            ],
          ),
        ),
      ),
    );
    if (added != true) return;
    try {
      final svc = ref.read(safetyServiceProvider);
      await svc.addTrustedContact(name: nameCtrl.text.trim(), phone: phoneCtrl.text.trim(), relation: relationCtrl.text.trim().isEmpty ? null : relationCtrl.text.trim());
      await _load();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error adding contact')));
    }
  }

  Future<void> _delete(TrustedContact c) async {
    final confirm = await showDialog<bool>(context: context, builder: (ctx) => AlertDialog(
      title: Text('trustedDeleteTitle'.tr()),
      content: Text('trustedDeleteBody'.tr(namedArgs: {'name': c.name})),
      actions: [
        TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: Text('cancel'.tr())),
        TextButton(onPressed: () => Navigator.of(ctx).pop(true), child: Text('delete'.tr(), style: const TextStyle(color: WeretTokens.error))),
      ],
    ));
    if (confirm != true) return;
    try {
      await ref.read(safetyServiceProvider).removeTrustedContact(c.id);
      await _load();
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WeretTokens.bg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text('trustedTitle'.tr(), style: const TextStyle(fontWeight: FontWeight.w700)),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _contacts.isEmpty
              ? Center(child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.contacts_outlined, size: 64, color: WeretTokens.textMuted),
                    const SizedBox(height: 16),
                    Text('trustedEmpty'.tr(), style: TextStyle(color: WeretTokens.textSecondary)),
                  ],
                ))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: _contacts.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (_, i) {
                      final c = _contacts[i];
                      return ListTile(
                        leading: CircleAvatar(child: Text(c.name.isNotEmpty ? c.name[0].toUpperCase() : '?')),
                        title: Text(c.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                        subtitle: Text('${c.phone}${c.relation != null ? ' · ${c.relation}' : ''}'),
                        trailing: IconButton(icon: const Icon(Icons.delete_outline, color: WeretTokens.error), onPressed: () => _delete(c)),
                      );
                    },
                  ),
                ),
      floatingActionButton: FloatingActionButton(
        onPressed: _add,
        backgroundColor: WeretTokens.brand,
        foregroundColor: Colors.white,
        child: const Icon(Icons.add),
      ),
    );
  }
}
