import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/wallet_provider.dart';
import '../../core/theme/app_styles.dart';
import '../../core/theme/weret_tokens.dart';
import '../../core/utils/api_error_message.dart';
import '../../shared/widgets/success_modal.dart';
import '../../shared/widgets/ui/form_error_callout.dart';
import '../../shared/widgets/weret_text_field.dart';
import '../../shared/widgets/custom_button.dart';
import 'wallet_labels.dart';

// ignore_for_file: unused_element
const _xs = 8.0;
const _sm = 12.0;
const _fieldGap = 14.0;
const _md = 16.0;
const _lg = 24.0;
const _xl = 32.0;
const _xxl = 60.0;

const _walletTypes = ['cash', 'instapay', 'vodafone', 'etisalat', 'orange', 'wepay'];

List<Map<String, dynamic>> _accounts(WalletState w) =>
    w.accounts.map((a) => Map<String, dynamic>.from(a as Map)).toList();

// ────────────────────────────────────────────────────────────
//  WalletDepositScreen
// ────────────────────────────────────────────────────────────

class WalletDepositScreen extends ConsumerStatefulWidget {
  const WalletDepositScreen({super.key});

  @override
  ConsumerState<WalletDepositScreen> createState() => _WalletDepositScreenState();
}

class _WalletDepositScreenState extends ConsumerState<WalletDepositScreen> {
  final _amountCtrl = TextEditingController();
  String? _selectedAccountId;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _amountCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    HapticFeedback.selectionClick();
    final accountId = _selectedAccountId;
    if (accountId == null) {
      setState(() => _error = 'walletSelectAccount'.tr());
      return;
    }
    final amount = num.tryParse(_amountCtrl.text.trim());
    if (amount == null || amount <= 0) {
      setState(() => _error = 'walletEnterValidAmount'.tr());
      return;
    }
    setState(() { _busy = true; _error = null; });
    try {
      await ref.read(walletProvider.notifier).deposit(accountId, amount);
      if (mounted) {
        SuccessModal.show(
          context,
          title: 'Top-up Success',
          description: 'Your payment wallet has been successfully done',
          amount: amount.toStringAsFixed(2),
          onDone: () {
            Navigator.pop(context);
            Navigator.pop(context);
          },
          onPayAgain: () => Navigator.pop(context),
        );
      }
    } catch (e) {
      if (mounted) setState(() => _error = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final w = ref.watch(walletProvider);
    final accounts = _accounts(w);
    return Scaffold(
      backgroundColor: WeretTokens.bg,
      body: SafeArea(
        child: Column(
          children: [
            _WalletHeader(
              title: 'driverDebitCardTopUp'.tr(),
              onBack: () { HapticFeedback.selectionClick(); Navigator.pop(context); },
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: _lg, vertical: _lg),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (_error != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: _md),
                        child: FormErrorCallout(message: _error!, onDismiss: () => setState(() => _error = null)),
                      ),
                    WeretTextField(
                      label: 'walletAmount'.tr(),
                      controller: _amountCtrl,
                      keyboardType: TextInputType.number,
                      hint: '0.00',
                      prefixText: 'EGP ',
                    ),
                    const SizedBox(height: _md),
                    Text('walletPickAccount'.tr(), style: AppStyles.label),
                    const SizedBox(height: 6),
                    DropdownButtonFormField<String>(
                      value: _selectedAccountId,
                      decoration: InputDecoration(
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(WeretTokens.fieldRadius)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: _md),
                      ),
                      hint: const Text('Choose one', style: TextStyle(color: WeretTokens.textMuted)),
                      items: accounts.map((a) {
                        final id = walletAccountId(a);
                        final label = a['label']?.toString() ?? walletTypeLabel('${a['walletType'] ?? ''}');
                        return DropdownMenuItem(value: id, child: Text(label));
                      }).toList(),
                      onChanged: (v) { HapticFeedback.selectionClick(); setState(() => _selectedAccountId = v); },
                    ),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(_lg),
              child: CustomButton(title: 'confirm'.tr(), onPressed: _submit, loading: _busy || w.loading),
            ),
          ],
        ),
      ),
    );
  }
}

// ────────────────────────────────────────────────────────────
//  WalletWithdrawScreen
// ────────────────────────────────────────────────────────────

class WalletWithdrawScreen extends ConsumerStatefulWidget {
  const WalletWithdrawScreen({super.key});

  @override
  ConsumerState<WalletWithdrawScreen> createState() => _WalletWithdrawScreenState();
}

class _WalletWithdrawScreenState extends ConsumerState<WalletWithdrawScreen> {
  final _amountCtrl = TextEditingController();
  final _otpCtrl = TextEditingController();
  String? _selectedAccountId;
  String? _requestId;
  bool _busy = false;
  bool _step2 = false;
  String? _error;

  @override
  void dispose() {
    _amountCtrl.dispose();
    _otpCtrl.dispose();
    super.dispose();
  }

  Future<void> _request() async {
    HapticFeedback.selectionClick();
    final accountId = _selectedAccountId;
    if (accountId == null) {
      setState(() => _error = 'walletSelectAccount'.tr());
      return;
    }
    final amount = num.tryParse(_amountCtrl.text.trim());
    if (amount == null || amount <= 0) {
      setState(() => _error = 'walletEnterValidAmount'.tr());
      return;
    }
    setState(() { _busy = true; _error = null; });
    try {
      final data = await ref.read(walletProvider.notifier).requestWithdraw(accountId, amount);
      if (mounted) {
        setState(() {
          _requestId = data['requestId']?.toString();
          _step2 = true;
          _busy = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() { _busy = false; _error = apiErrorMessage(e); });
    }
  }

  Future<void> _confirm() async {
    HapticFeedback.selectionClick();
    final requestId = _requestId;
    final otp = _otpCtrl.text.trim();
    if (requestId == null || otp.isEmpty) {
      setState(() => _error = 'walletEnterOtp'.tr());
      return;
    }
    setState(() { _busy = true; _error = null; });
    try {
      await ref.read(walletProvider.notifier).confirmWithdraw(requestId, otp);
      if (mounted) {
        SuccessModal.show(
          context,
          title: 'Transfer Success',
          description: 'Your transfer has been completed successfully',
          amount: _amountCtrl.text.trim(),
          onDone: () {
            Navigator.pop(context);
            Navigator.pop(context);
          },
          onPayAgain: () => Navigator.pop(context),
        );
      }
    } catch (e) {
      if (mounted) setState(() => _error = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final w = ref.watch(walletProvider);
    final accounts = _accounts(w);
    return Scaffold(
      backgroundColor: WeretTokens.bg,
      body: SafeArea(
        child: Column(
          children: [
            _WalletHeader(
              title: 'walletWithdraw'.tr(),
              height: 120,
              onBack: () { HapticFeedback.selectionClick(); Navigator.pop(context); },
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: _lg, vertical: _lg),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (_error != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: _md),
                        child: FormErrorCallout(message: _error!, onDismiss: () => setState(() => _error = null)),
                      ),
                    if (_step2) _buildOtpStep() else _buildRequestStep(accounts),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(_lg),
              child: CustomButton(
                title: _step2 ? 'walletConfirmWithdraw'.tr() : 'walletWithdraw'.tr(),
                onPressed: _step2 ? _confirm : _request,
                loading: _busy || w.loading,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRequestStep(List<Map<String, dynamic>> accounts) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        WeretTextField(
          label: 'walletAmount'.tr(),
          controller: _amountCtrl,
          keyboardType: TextInputType.number,
          hint: '0.00',
          prefixText: 'EGP ',
        ),
        const SizedBox(height: _md),
        Text('walletPickAccount'.tr(), style: AppStyles.label),
        const SizedBox(height: 6),
        DropdownButtonFormField<String>(
          value: _selectedAccountId,
          decoration: InputDecoration(
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(WeretTokens.fieldRadius)),
            contentPadding: const EdgeInsets.symmetric(horizontal: _md),
          ),
          hint: const Text('Choose one', style: TextStyle(color: WeretTokens.textMuted)),
          items: accounts.map((a) {
            final id = walletAccountId(a);
            final label = a['label']?.toString() ?? walletTypeLabel('${a['walletType'] ?? ''}');
            return DropdownMenuItem(value: id, child: Text(label));
          }).toList(),
          onChanged: (v) { HapticFeedback.selectionClick(); setState(() => _selectedAccountId = v); },
        ),
      ],
    );
  }

  Widget _buildOtpStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'walletWithdrawOtpHint'.tr(),
          style: const TextStyle(fontSize: 14, color: WeretTokens.textSecondary),
        ),
        const SizedBox(height: _lg),
        WeretTextField(
          label: 'walletEnterOtpTitle'.tr(),
          controller: _otpCtrl,
          keyboardType: TextInputType.number,
          hint: 'walletEnterOtpTitle'.tr(),
        ),
      ],
    );
  }
}

// ────────────────────────────────────────────────────────────
//  WalletHistoryScreen
// ────────────────────────────────────────────────────────────

class WalletHistoryScreen extends ConsumerStatefulWidget {
  const WalletHistoryScreen({super.key});

  @override
  ConsumerState<WalletHistoryScreen> createState() => _WalletHistoryScreenState();
}

class _WalletHistoryScreenState extends ConsumerState<WalletHistoryScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(walletProvider.notifier).fetchTransactions(page: 1));
  }

  @override
  Widget build(BuildContext context) {
    final w = ref.watch(walletProvider);
    final txs = w.transactions;
    final pag = w.transactionsPagination;
    return Scaffold(
      backgroundColor: WeretTokens.bg,
      appBar: AppBar(
        title: Text('walletHistory'.tr(), style: AppStyles.title),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () { HapticFeedback.selectionClick(); context.pop(); },
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(walletProvider.notifier).fetchTransactions(page: pag.page),
        child: w.transactionsLoading && txs.isEmpty
            ? const Center(child: CircularProgressIndicator())
            : w.transactionsError != null && txs.isEmpty
                ? ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    children: [
                      SizedBox(height: MediaQuery.sizeOf(context).height * 0.3),
                      Center(
                        child: Column(
                          children: [
                            Text(w.transactionsError!, style: AppStyles.bodySmall.copyWith(color: WeretTokens.error)),
                            const SizedBox(height: _sm),
                            TextButton(
                              onPressed: () { HapticFeedback.selectionClick(); ref.read(walletProvider.notifier).fetchTransactions(page: 1); },
                              child: Text('retry'.tr()),
                            ),
                          ],
                        ),
                      ),
                    ],
                  )
                : txs.isEmpty
                    ? ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        children: [
                          SizedBox(height: MediaQuery.sizeOf(context).height * 0.3),
                          Center(child: Text('walletNoTx'.tr(), style: const TextStyle(color: WeretTokens.textMuted))),
                        ],
                      )
                    : Column(
                        children: [
                          Expanded(
                            child: ListView.separated(
                              padding: const EdgeInsets.all(_md),
                              itemCount: txs.length,
                              separatorBuilder: (_, __) => const SizedBox(height: _xs),
                              itemBuilder: (_, i) {
                                final tx = Map<String, dynamic>.from(txs[i] as Map);
                                final type = '${tx['type'] ?? ''}';
                                final amt = tx['amount'] ?? 0;
                                final note = tx['note']?.toString() ?? '';
                                final created = tx['createdAt']?.toString() ?? '';
                                final isCredit = type == 'deposit' || type == 'ride_payment' || type == 'ride_refund';
                                return _TransactionCard(
                                  typeLabel: walletTxTypeLabel(type),
                                  note: note,
                                  created: created,
                                  amount: '${isCredit ? '+' : '-'}$amt',
                                  isCredit: isCredit,
                                );
                              },
                            ),
                          ),
                          if (pag.totalPages > 1)
                            Container(
                              decoration: BoxDecoration(
                                color: WeretTokens.surface,
                                border: Border(top: BorderSide(color: WeretTokens.borderSubtle)),
                              ),
                              padding: const EdgeInsets.symmetric(horizontal: _md, vertical: 12),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  TextButton.icon(
                                    onPressed: pag.hasPrev
                                        ? () { HapticFeedback.selectionClick(); ref.read(walletProvider.notifier).fetchTransactions(page: pag.page - 1); }
                                        : null,
                                    icon: const Icon(Icons.chevron_left, size: 20),
                                    label: Text('driverBackPrevious'.tr()),
                                  ),
                                  Text('${pag.page} / ${pag.totalPages}',
                                      style: AppStyles.bodySmall),
                                  TextButton.icon(
                                    onPressed: pag.hasNext
                                        ? () { HapticFeedback.selectionClick(); ref.read(walletProvider.notifier).fetchTransactions(page: pag.page + 1); }
                                        : null,
                                    icon: const Icon(Icons.chevron_right, size: 20),
                                    label: Text('registerNext'.tr()),
                                  ),
                                ],
                              ),
                            ),
                        ],
                      ),
      ),
    );
  }
}

// ── Transaction card widget ──

class _TransactionCard extends StatelessWidget {
  const _TransactionCard({
    required this.typeLabel,
    required this.note,
    required this.created,
    required this.amount,
    required this.isCredit,
  });

  final String typeLabel;
  final String note;
  final String created;
  final String amount;
  final bool isCredit;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(WeretTokens.sp14),
      decoration: BoxDecoration(
        color: WeretTokens.surface,
        borderRadius: BorderRadius.circular(WeretTokens.cardRadius),
        border: Border.all(color: WeretTokens.borderSubtle.withValues(alpha: 0.7)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(typeLabel, style: AppStyles.bodySemiBold),
                if (note.isNotEmpty) Text(note, style: AppStyles.bodySmall),
                if (created.isNotEmpty) Text(created, style: AppStyles.caption),
              ],
            ),
          ),
          Text(
            amount,
            style: AppStyles.priceSmall.copyWith(
              color: isCredit ? WeretTokens.success : WeretTokens.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}

// ────────────────────────────────────────────────────────────
//  WalletAddAccountScreen
// ────────────────────────────────────────────────────────────

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
  String? _error;

  @override
  void dispose() {
    _phone.dispose();
    _label.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    HapticFeedback.selectionClick();
    if (_type != 'cash' && _phone.text.trim().isEmpty) {
      setState(() => _error = 'walletPhoneMsisdn'.tr());
      return;
    }
    setState(() { _busy = true; _error = null; });
    try {
      await ref.read(walletProvider.notifier).createAccount(
            _type,
            phoneNumber: _phone.text.trim().isEmpty ? null : _phone.text.trim(),
            label: _label.text.trim().isEmpty ? null : _label.text.trim(),
          );
      if (mounted) {
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) setState(() => _error = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WeretTokens.bg,
      appBar: AppBar(
        title: Text('paymentMethodsAdd'.tr(), style: AppStyles.title),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () { HapticFeedback.selectionClick(); Navigator.pop(context); },
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(_md),
        children: [
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: _md),
              child: FormErrorCallout(message: _error!, onDismiss: () => setState(() => _error = null)),
            ),
          _TypeCard(type: _type, onChanged: (v) { HapticFeedback.selectionClick(); setState(() => _type = v); }),
          if (_type != 'cash') ...[
            const SizedBox(height: _md),
            WeretTextField(
              label: 'phone'.tr(),
              controller: _phone,
              keyboardType: TextInputType.phone,
              hint: 'phone'.tr(),
            ),
          ],
          const SizedBox(height: _md),
          WeretTextField(
            label: 'paymentLabelOptional'.tr(),
            controller: _label,
            hint: 'paymentLabelOptional'.tr(),
          ),
          const SizedBox(height: 20),
          CustomButton(title: 'save'.tr(), onPressed: _save, loading: _busy),
        ],
      ),
    );
  }
}

// ── Type selection card ──

class _TypeCard extends StatelessWidget {
  const _TypeCard({required this.type, required this.onChanged});

  final String type;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(_md),
      decoration: BoxDecoration(
        color: WeretTokens.surface,
        borderRadius: BorderRadius.circular(WeretTokens.cardRadius),
        border: Border.all(color: WeretTokens.borderSubtle.withValues(alpha: 0.7)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('walletSelectType'.tr(), style: AppStyles.bodySemiBold),
          const SizedBox(height: _xs),
          DropdownButtonFormField<String>(
            initialValue: type,
            decoration: InputDecoration(
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(WeretTokens.fieldRadius)),
            ),
            items: _walletTypes.map((t) => DropdownMenuItem(value: t, child: Text(walletTypeLabel(t)))).toList(),
            onChanged: (v) => onChanged(v ?? 'cash'),
          ),
        ],
      ),
    );
  }
}

// ── Shared brand header widget ──

class _WalletHeader extends StatelessWidget {
  const _WalletHeader({
    required this.title,
    this.height = 180,
    required this.onBack,
  });

  final String title;
  final double height;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      height: height,
      decoration: const BoxDecoration(
        color: WeretTokens.brand,
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(30),
          bottomRight: Radius.circular(30),
        ),
      ),
      child: Stack(
        children: [
          Positioned(
            left: _md,
            top: _md,
            child: IconButton(
              icon: const Icon(Icons.arrow_back, color: WeretTokens.surface, size: 20),
              onPressed: onBack,
            ),
          ),
          Center(
            child: Text(title,
                style: const TextStyle(color: WeretTokens.surface, fontWeight: FontWeight.bold, fontSize: 18)),
          ),
        ],
      ),
    );
  }
}
