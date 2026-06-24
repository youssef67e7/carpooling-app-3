import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/wallet_provider.dart';
import '../../core/theme/weret_tokens.dart';
import '../../core/utils/api_error_message.dart';
import 'wallet_labels.dart';
import '../../shared/widgets/custom_button.dart';
import '../../shared/widgets/weret_page_scaffold.dart';
import '../../shared/widgets/weret_section_card.dart';
import '../../shared/widgets/weret_text_field.dart';

const _walletTypes = ['cash', 'instapay', 'vodafone', 'etisalat', 'orange', 'wepay'];

List<Map<String, dynamic>> _accounts(WalletState w) =>
    w.accounts.map((a) => Map<String, dynamic>.from(a as Map)).toList();

class WalletDepositScreen extends ConsumerStatefulWidget {
  const WalletDepositScreen({super.key});

  @override
  ConsumerState<WalletDepositScreen> createState() => _WalletDepositScreenState();
}

class _WalletDepositScreenState extends ConsumerState<WalletDepositScreen> {
  final _amount = TextEditingController();
  String? _accountId;
  bool _busy = false;

  @override
  void dispose() {
    _amount.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final id = _accountId;
    final amt = num.tryParse(_amount.text.trim());
    if (id == null || amt == null || amt <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('walletFillFields'.tr())));
      return;
    }
    setState(() => _busy = true);
    try {
      await ref.read(walletProvider.notifier).deposit(id, amt);
      await ref.read(walletProvider.notifier).fetchTransactions();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('walletDepositDone'.tr())));
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final accounts = _accounts(ref.watch(walletProvider));
    _accountId ??= accounts.isNotEmpty ? walletAccountId(accounts.first) : null;

    return WeretPageScaffold(
      title: 'walletAddMoney'.tr(),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('walletSimulatedDisclaimer'.tr(), style: const TextStyle(color: WeretTokens.textSecondary, fontSize: 13)),
          const SizedBox(height: 16),
          WeretSectionCard(
            title: 'walletPickAccount'.tr(),
            child: accounts.isEmpty
                ? Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text('walletNoMethods'.tr()),
                      const SizedBox(height: 12),
                      CustomButton(title: 'walletAddMethod'.tr(), onPressed: () => context.push('add-account')),
                    ],
                  )
                : DropdownButtonFormField<String>(
                    initialValue: _accountId,
                    decoration: InputDecoration(border: OutlineInputBorder(borderRadius: BorderRadius.circular(12))),
                    items: accounts
                        .map(
                          (a) => DropdownMenuItem(
                            value: walletAccountId(a),
                            child: Text('${walletTypeLabel('${a['walletType']}')} — ${a['balance'] ?? 0}'),
                          ),
                        )
                        .toList(),
                    onChanged: (v) => setState(() => _accountId = v),
                  ),
          ),
          const SizedBox(height: 16),
          WeretTextField(controller: _amount, label: 'walletAmount'.tr(), keyboardType: TextInputType.number),
          const SizedBox(height: 20),
          CustomButton(title: 'walletAddMoney'.tr(), loading: _busy, onPressed: _submit),
        ],
      ),
    );
  }
}

class WalletWithdrawScreen extends ConsumerStatefulWidget {
  const WalletWithdrawScreen({super.key});

  @override
  ConsumerState<WalletWithdrawScreen> createState() => _WalletWithdrawScreenState();
}

class _WalletWithdrawScreenState extends ConsumerState<WalletWithdrawScreen> {
  final _amount = TextEditingController();
  final _otp = TextEditingController();
  String? _accountId;
  String? _requestId;
  String? _devOtp;
  bool _busy = false;
  bool _awaitingOtp = false;

  @override
  void dispose() {
    _amount.dispose();
    _otp.dispose();
    super.dispose();
  }

  Future<void> _requestCode() async {
    final id = _accountId;
    final amt = num.tryParse(_amount.text.trim());
    if (id == null || amt == null || amt <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('walletFillFields'.tr())));
      return;
    }
    setState(() => _busy = true);
    try {
      final data = await ref.read(walletProvider.notifier).requestWithdraw(id, amt);
      setState(() {
        _awaitingOtp = true;
        _requestId = '${data['requestId']}';
        _devOtp = data['_devOtp']?.toString();
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _confirm() async {
    final req = _requestId;
    final code = _otp.text.trim();
    if (req == null || code.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('walletEnterOtp'.tr())));
      return;
    }
    setState(() => _busy = true);
    try {
      await ref.read(walletProvider.notifier).confirmWithdraw(req, code);
      await ref.read(walletProvider.notifier).fetchTransactions();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('walletWithdrawDone'.tr())));
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _cancelOtp() {
    setState(() {
      _awaitingOtp = false;
      _requestId = null;
      _devOtp = null;
      _otp.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    final accounts = _accounts(ref.watch(walletProvider));
    _accountId ??= accounts.isNotEmpty ? walletAccountId(accounts.first) : null;

    return WeretPageScaffold(
      title: 'walletWithdraw'.tr(),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('walletWithdrawOtpHint'.tr(), style: const TextStyle(color: WeretTokens.textSecondary, fontSize: 13)),
          if (_devOtp != null) ...[
            const SizedBox(height: 8),
            Text('DEV OTP: $_devOtp', style: const TextStyle(fontWeight: FontWeight.w700, color: Colors.orange)),
          ],
          const SizedBox(height: 16),
          if (!_awaitingOtp) ...[
            WeretSectionCard(
              title: 'walletPickAccount'.tr(),
              child: accounts.isEmpty
                  ? Text('walletNoMethods'.tr())
                  : DropdownButtonFormField<String>(
                      initialValue: _accountId,
                      decoration: InputDecoration(border: OutlineInputBorder(borderRadius: BorderRadius.circular(12))),
                      items: accounts
                          .map(
                            (a) => DropdownMenuItem(
                              value: walletAccountId(a),
                              child: Text('${walletTypeLabel('${a['walletType']}')} — ${a['balance'] ?? 0}'),
                            ),
                          )
                          .toList(),
                      onChanged: (v) => setState(() => _accountId = v),
                    ),
            ),
            const SizedBox(height: 16),
            WeretTextField(controller: _amount, label: 'walletAmount'.tr(), keyboardType: TextInputType.number),
            const SizedBox(height: 20),
            CustomButton(title: 'walletSendCode'.tr(), loading: _busy, onPressed: _requestCode),
          ] else ...[
            WeretSectionCard(
              title: 'walletEnterOtpTitle'.tr(),
              child: WeretTextField(controller: _otp, label: 'walletEnterOtpTitle'.tr(), keyboardType: TextInputType.number),
            ),
            const SizedBox(height: 20),
            CustomButton(title: 'walletConfirmWithdraw'.tr(), loading: _busy, onPressed: _confirm),
            const SizedBox(height: 10),
            CustomButton(title: 'walletCancelRequest'.tr(), variant: 'outline', onPressed: _cancelOtp),
          ],
        ],
      ),
    );
  }
}

class WalletHistoryScreen extends ConsumerStatefulWidget {
  const WalletHistoryScreen({super.key});

  @override
  ConsumerState<WalletHistoryScreen> createState() => _WalletHistoryScreenState();
}

class _WalletHistoryScreenState extends ConsumerState<WalletHistoryScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(walletProvider.notifier).fetchTransactions());
  }

  @override
  Widget build(BuildContext context) {
    final txs = ref.watch(walletProvider).transactions;

    return WeretPageScaffold(
      title: 'walletHistory'.tr(),
      body: RefreshIndicator(
        onRefresh: () => ref.read(walletProvider.notifier).fetchTransactions(),
        child: txs.isEmpty
            ? ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: [SizedBox(height: MediaQuery.sizeOf(context).height * 0.3), Center(child: Text('walletNoTx'.tr()))],
              )
            : ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: txs.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (_, i) {
                  final tx = Map<String, dynamic>.from(txs[i] as Map);
                  final type = '${tx['type'] ?? ''}';
                  final amt = tx['amount'] ?? 0;
                  final note = tx['note']?.toString() ?? '';
                  final created = tx['createdAt']?.toString() ?? '';
                  final isCredit = type == 'deposit' || type == 'ride_payment';
                  return Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: WeretTokens.surface,
                      borderRadius: BorderRadius.circular(WeretTokens.cardRadius),
                      border: Border.all(color: WeretTokens.border.withValues(alpha: 0.7)),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(walletTxTypeLabel(type), style: const TextStyle(fontWeight: FontWeight.w700)),
                              if (note.isNotEmpty) Text(note, style: const TextStyle(color: WeretTokens.textSecondary, fontSize: 12)),
                              if (created.isNotEmpty) Text(created, style: const TextStyle(color: WeretTokens.textSecondary, fontSize: 11)),
                            ],
                          ),
                        ),
                        Text(
                          '${isCredit ? '+' : '-'}$amt',
                          style: TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 18,
                            color: isCredit ? Colors.green.shade700 : WeretTokens.textPrimary,
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
      ),
    );
  }
}

class WalletAddAccountScreen extends ConsumerStatefulWidget {
  const WalletAddAccountScreen({super.key});

  @override
  ConsumerState<WalletAddAccountScreen> createState() => _WalletAddAccountScreenState();
}

class _WalletAddAccountScreenState extends ConsumerState<WalletAddAccountScreen> {
  String _type = 'cash';
  final _phone = TextEditingController();
  final _label = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _phone.dispose();
    _label.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_type != 'cash' && _phone.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('walletPhoneMsisdn'.tr())));
      return;
    }
    setState(() => _busy = true);
    try {
      await ref.read(walletProvider.notifier).createAccount(
            _type,
            phoneNumber: _phone.text.trim().isEmpty ? null : _phone.text.trim(),
            label: _label.text.trim().isEmpty ? null : _label.text.trim(),
          );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('walletMethodAdded'.tr())));
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return WeretPageScaffold(
      title: 'walletAddMethod'.tr(),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          WeretSectionCard(
            title: 'walletSelectType'.tr(),
            child: DropdownButtonFormField<String>(
              initialValue: _type,
              decoration: InputDecoration(border: OutlineInputBorder(borderRadius: BorderRadius.circular(12))),
              items: _walletTypes.map((t) => DropdownMenuItem(value: t, child: Text(walletTypeLabel(t)))).toList(),
              onChanged: (v) => setState(() => _type = v ?? 'cash'),
            ),
          ),
          if (_type != 'cash') ...[
            const SizedBox(height: 16),
            WeretTextField(controller: _phone, label: 'walletPhoneMsisdn'.tr(), keyboardType: TextInputType.phone),
          ],
          const SizedBox(height: 16),
          WeretTextField(controller: _label, label: 'walletOptionalLabel'.tr(), hint: 'walletOptionalLabelPh'.tr()),
          const SizedBox(height: 20),
          CustomButton(title: 'walletSaveMethod'.tr(), loading: _busy, onPressed: _save),
        ],
      ),
    );
  }
}
