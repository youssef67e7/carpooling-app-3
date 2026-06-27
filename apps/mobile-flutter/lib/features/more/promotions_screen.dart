import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/promotions_provider.dart';
import '../../core/theme/weret_tokens.dart';
import '../../shared/widgets/weret_page_scaffold.dart';

class PromotionsScreen extends ConsumerStatefulWidget {
  final bool isAdmin;
  const PromotionsScreen({super.key, this.isAdmin = false});
  @override
  ConsumerState<PromotionsScreen> createState() => _PromotionsScreenState();
}

class _PromotionsScreenState extends ConsumerState<PromotionsScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      if (widget.isAdmin) {
        ref.read(promotionsProvider.notifier).fetchAdmin();
      } else {
        ref.read(promotionsProvider.notifier).fetchActive();
      }
    });
  }

  void _showCreateSheet() {
    final codeCtrl = TextEditingController();
    final titleCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    String discountType = 'percentage';
    final discountCtrl = TextEditingController();
    final maxDiscountCtrl = TextEditingController();
    final minFareCtrl = TextEditingController();
    final maxUsesCtrl = TextEditingController();
    String? codeError;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return StatefulBuilder(builder: (ctx, setSheetState) {
          return Padding(
            padding: EdgeInsets.only(left: 24, right: 24, top: 24, bottom: MediaQuery.of(ctx).viewInsets.bottom + 24),
            child: SingleChildScrollView(
              child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                Text('promoCreate'.tr(), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                TextField(controller: codeCtrl, decoration: InputDecoration(labelText: 'promoCode'.tr(), border: const OutlineInputBorder(), errorText: codeError)),
                const SizedBox(height: 12),
                TextField(controller: titleCtrl, decoration: InputDecoration(labelText: 'promoTitle'.tr(), border: const OutlineInputBorder())),
                const SizedBox(height: 12),
                TextField(controller: descCtrl, decoration: InputDecoration(labelText: 'promoDescription'.tr(), border: const OutlineInputBorder()), maxLines: 2),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: discountType,
                  decoration: InputDecoration(labelText: 'promoDiscountType'.tr(), border: const OutlineInputBorder()),
                  items: ['percentage', 'fixed'].map((t) => DropdownMenuItem(value: t, child: Text('promoDiscount${t[0].toUpperCase()}${t.substring(1)}'.tr()))).toList(),
                  onChanged: (v) => setSheetState(() => discountType = v ?? 'percentage'),
                ),
                const SizedBox(height: 12),
                TextField(controller: discountCtrl, decoration: InputDecoration(labelText: discountType == 'percentage' ? 'promoDiscountPercent'.tr() : 'promoDiscountFixed'.tr(), border: const OutlineInputBorder()), keyboardType: TextInputType.number),
                const SizedBox(height: 12),
                TextField(controller: maxDiscountCtrl, decoration: InputDecoration(labelText: 'promoMaxDiscount'.tr(), border: const OutlineInputBorder()), keyboardType: TextInputType.number),
                const SizedBox(height: 12),
                TextField(controller: minFareCtrl, decoration: InputDecoration(labelText: 'promoMinFare'.tr(), border: const OutlineInputBorder()), keyboardType: TextInputType.number),
                const SizedBox(height: 12),
                TextField(controller: maxUsesCtrl, decoration: InputDecoration(labelText: 'promoMaxUses'.tr(), border: const OutlineInputBorder()), keyboardType: TextInputType.number),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () async {
                    final code = codeCtrl.text.trim();
                    if (code.isEmpty) { setSheetState(() => codeError = 'Required'); return; }
                    try {
                      await ref.read(promotionsProvider.notifier).create({
                        'code': code,
                        'title': titleCtrl.text.trim(),
                        'description': descCtrl.text.trim(),
                        'discountType': discountType,
                        'discountValue': double.tryParse(discountCtrl.text.trim()) ?? 0,
                        if (maxDiscountCtrl.text.trim().isNotEmpty) 'maxDiscount': double.tryParse(maxDiscountCtrl.text.trim()),
                        if (minFareCtrl.text.trim().isNotEmpty) 'minRideFare': double.tryParse(minFareCtrl.text.trim()),
                        if (maxUsesCtrl.text.trim().isNotEmpty) 'maxUses': int.tryParse(maxUsesCtrl.text.trim()),
                        'expiresAt': DateTime.now().add(const Duration(days: 30)).toIso8601String(),
                      });
                      if (ctx.mounted) Navigator.of(ctx).pop();
                    } catch (_) {}
                  },
                  child: Text('promoCreate'.tr()),
                ),
              ]),
            ),
          );
        });
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(promotionsProvider);
    final items = widget.isAdmin ? s.promos : s.activePromos;

    return WeretPageScaffold(
      title: widget.isAdmin ? 'promoAdminTitle'.tr() : 'featurePromotions'.tr(),
      body: s.loading
          ? const Center(child: CircularProgressIndicator())
          : items.isEmpty
              ? Center(child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    Icon(Icons.local_offer_outlined, size: 64, color: WeretTokens.textMuted),
                    const SizedBox(height: 16),
                    Text(widget.isAdmin ? 'promoAdminEmpty'.tr() : 'promoEmpty'.tr(), textAlign: TextAlign.center, style: const TextStyle(fontSize: 16)),
                  ]),
                ))
              : ListView.builder(
                  padding: const EdgeInsets.only(top: 8, bottom: 88),
                  itemCount: items.length,
                  itemBuilder: (_, i) {
                    final p = items[i] as Map<String, dynamic>;
                    final isPct = p['discountType'] == 'percentage';
                    return Card(
                      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: p['isActive'] == true ? WeretTokens.brand : WeretTokens.textMuted,
                          child: const Icon(Icons.local_offer, color: Colors.white),
                        ),
                        title: Text(p['title'] as String? ?? ''),
                        subtitle: Text('${p['code'] as String? ?? ''}  —  ${isPct ? '${p['discountValue']}%' : '\$${p['discountValue']}'}'),
                        trailing: widget.isAdmin
                            ? Switch(
                                value: p['isActive'] == true,
                                onChanged: (_) => ref.read(promotionsProvider.notifier).toggle(p['_id'] as String),
                                activeColor: WeretTokens.brand,
                              )
                            : null,
                      ),
                    );
                  },
                ),
      floatingActionButton: widget.isAdmin
          ? FloatingActionButton(onPressed: _showCreateSheet, child: const Icon(Icons.add))
          : null,
    );
  }
}
