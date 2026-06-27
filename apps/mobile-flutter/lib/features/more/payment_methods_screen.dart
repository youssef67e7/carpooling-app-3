import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/wallet_provider.dart';
import '../../core/theme/weret_tokens.dart';
import '../../features/wallet/wallet_labels.dart';
import '../../shared/widgets/weret_page_scaffold.dart';

const _cardBrands = ['visa', 'mastercard', 'amex', 'mada'];

class PaymentMethodsScreen extends ConsumerStatefulWidget {
  const PaymentMethodsScreen({super.key});
  @override
  ConsumerState<PaymentMethodsScreen> createState() => _PaymentMethodsScreenState();
}

class _PaymentMethodsScreenState extends ConsumerState<PaymentMethodsScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(walletProvider.notifier).fetchAccounts());
  }

  void _showAddMethodSheet() {
    String type = 'cash';
    final phoneCtrl = TextEditingController();
    final labelCtrl = TextEditingController();
    final cardNumCtrl = TextEditingController();
    final cardExpiryCtrl = TextEditingController();
    final cardHolderCtrl = TextEditingController();
    String cardBrand = 'visa';
    bool isDefault = false;

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
                Text('paymentMethodsAdd'.tr(), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  value: type,
                  decoration: InputDecoration(labelText: 'walletSelectType'.tr(), border: const OutlineInputBorder()),
                  items: ['cash', 'instapay', 'vodafone', 'etisalat', 'orange', 'wepay', 'card']
                      .map((t) => DropdownMenuItem(value: t, child: Text(t == 'card' ? 'paymentCard'.tr() : walletTypeLabel(t))))
                      .toList(),
                  onChanged: (v) => setSheetState(() => type = v ?? 'cash'),
                ),
                const SizedBox(height: 12),
                if (type == 'card') ...[
                  TextField(controller: cardNumCtrl, decoration: InputDecoration(labelText: 'paymentCardNumber'.tr(), border: const OutlineInputBorder()), keyboardType: TextInputType.number, maxLength: 19),
                  const SizedBox(height: 12),
                  Row(children: [
                    Expanded(child: TextField(controller: cardExpiryCtrl, decoration: InputDecoration(labelText: 'paymentCardExpiry'.tr(), border: const OutlineInputBorder(), hintText: 'MM/YY'))),
                    const SizedBox(width: 12),
                    Expanded(child: DropdownButtonFormField<String>(
                      value: cardBrand,
                      decoration: InputDecoration(labelText: 'paymentCardType'.tr(), border: const OutlineInputBorder()),
                      items: _cardBrands.map((b) => DropdownMenuItem(value: b, child: Text(b[0].toUpperCase() + b.substring(1)))).toList(),
                      onChanged: (v) => setSheetState(() => cardBrand = v ?? 'visa'),
                    )),
                  ]),
                  const SizedBox(height: 12),
                  TextField(controller: cardHolderCtrl, decoration: InputDecoration(labelText: 'paymentCardHolder'.tr(), border: const OutlineInputBorder())),
                ] else ...[
                  if (type != 'cash')
                    TextField(controller: phoneCtrl, decoration: InputDecoration(labelText: 'walletPhoneMsisdn'.tr(), border: const OutlineInputBorder()), keyboardType: TextInputType.phone),
                  const SizedBox(height: 12),
                  TextField(controller: labelCtrl, decoration: InputDecoration(labelText: 'paymentLabelOptional'.tr(), border: const OutlineInputBorder())),
                ],
                const SizedBox(height: 12),
                CheckboxListTile(
                  value: isDefault,
                  onChanged: (v) => setSheetState(() => isDefault = v ?? false),
                  title: Text('paymentSetDefault'.tr()),
                  controlAffinity: ListTileControlAffinity.leading,
                  contentPadding: EdgeInsets.zero,
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () async {
                    if (type == 'card') {
                      final num = cardNumCtrl.text.trim().replaceAll(' ', '');
                      if (num.length < 4) return;
                      final lastFour = num.substring(num.length - 4);
                      try {
                        await ref.read(walletProvider.notifier).createAccount(
                          'card',
                          cardLastFour: lastFour,
                          cardExpiry: cardExpiryCtrl.text.trim(),
                          cardHolder: cardHolderCtrl.text.trim(),
                          cardBrand: cardBrand,
                          isDefault: isDefault,
                        );
                        if (ctx.mounted) Navigator.of(ctx).pop();
                      } catch (_) {}
                    } else {
                      if (type != 'cash' && phoneCtrl.text.trim().isEmpty) return;
                      try {
                        await ref.read(walletProvider.notifier).createAccount(
                          type,
                          phoneNumber: phoneCtrl.text.trim().isEmpty ? null : phoneCtrl.text.trim(),
                          label: labelCtrl.text.trim().isEmpty ? null : labelCtrl.text.trim(),
                          isDefault: isDefault,
                        );
                        if (ctx.mounted) Navigator.of(ctx).pop();
                      } catch (_) {}
                    }
                  },
                  child: Text('paymentMethodsAdd'.tr()),
                ),
              ]),
            ),
          );
        });
      },
    );
  }

  IconData _iconFor(String? type) {
    switch (type) {
      case 'card': return Icons.credit_card;
      case 'cash': return Icons.money;
      case 'instapay': return Icons.phone_android;
      case 'vodafone': return Icons.phone_android;
      case 'etisalat': return Icons.phone_android;
      case 'orange': return Icons.phone_android;
      case 'wepay': return Icons.account_balance;
      default: return Icons.account_balance_wallet;
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(walletProvider);
    final accounts = s.accounts;

    if (s.loading && accounts.isEmpty) {
      return WeretPageScaffold(
        title: 'paymentMethodsTitle'.tr(),
        body: const Center(child: CircularProgressIndicator()),
      );
    }
    if (s.error != null && accounts.isEmpty) {
      return WeretPageScaffold(
        title: 'paymentMethodsTitle'.tr(),
        body: Center(child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Icon(Icons.error_outline, size: 64, color: WeretTokens.error),
            const SizedBox(height: 16),
            Text('$s.error', textAlign: TextAlign.center, style: TextStyle(color: WeretTokens.error, fontSize: 14)),
            const SizedBox(height: 16),
            FilledButton(onPressed: () => ref.read(walletProvider.notifier).fetchAccounts(), child: Text('retry'.tr())),
          ]),
        )),
      );
    }
    return WeretPageScaffold(
      title: 'paymentMethodsTitle'.tr(),
      body: accounts.isEmpty
          ? Center(child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                Icon(Icons.credit_card_outlined, size: 64, color: WeretTokens.textMuted),
                const SizedBox(height: 16),
                Text('paymentMethodsIntro'.tr(), textAlign: TextAlign.center, style: const TextStyle(fontSize: 16)),
              ]),
            ))
          : ListView.builder(
              padding: const EdgeInsets.only(top: 8, bottom: 88),
              itemCount: accounts.length,
              itemBuilder: (_, i) {
                final a = accounts[i] as Map<String, dynamic>;
                final isCard = a['walletType'] == 'card';
                final isDefault = a['isDefault'] == true;
                return Card(
                  margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: isDefault ? WeretTokens.brand : WeretTokens.surface,
                      child: Icon(_iconFor(a['walletType'] as String?), color: isDefault ? Colors.white : WeretTokens.brand),
                    ),
                    title: Text(
                      isCard ? '${(a['cardBrand'] as String? ?? '').toUpperCase()} •••• ${a['cardLastFour'] as String? ?? ''}'
                             : (a['label'] as String? ?? walletTypeLabel(a['walletType'] as String? ?? '')),
                      style: TextStyle(fontWeight: isDefault ? FontWeight.bold : FontWeight.normal),
                    ),
                    subtitle: Text(
                      isCard ? '${a['cardHolder'] as String? ?? ''}  |  ${a['cardExpiry'] as String? ?? ''}'
                             : (a['phoneNumber'] as String? ?? ''),
                      maxLines: 1, overflow: TextOverflow.ellipsis,
                    ),
                    trailing: PopupMenuButton<String>(
                      onSelected: (action) async {
                        final id = a['_id'] as String;
                        if (action == 'delete') {
                          await ref.read(walletProvider.notifier).deleteAccount(id);
                        } else if (action == 'default') {
                          await ref.read(walletProvider.notifier).setDefaultAccount(id);
                        }
                      },
                      itemBuilder: (_) => [
                        if (!isDefault)
                          PopupMenuItem(value: 'default', child: Text('paymentSetDefault'.tr())),
                        PopupMenuItem(value: 'delete', child: Text('delete'.tr())),
                      ],
                    ),
                  ),
                );
              },
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showAddMethodSheet,
        child: const Icon(Icons.add),
      ),
    );
  }
}
