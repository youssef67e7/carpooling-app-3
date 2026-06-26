import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/wallet_provider.dart';
import '../../core/theme/weret_tokens.dart';
import '../../core/utils/api_error_message.dart';
import '../../shared/widgets/success_modal.dart';
import 'wallet_labels.dart';

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

  @override
  void dispose() {
    _amountCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final accountId = _selectedAccountId;
    if (accountId == null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('walletSelectAccount'.tr())));
      return;
    }
    final amount = num.tryParse(_amountCtrl.text.trim());
    if (amount == null || amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('walletEnterValidAmount'.tr())));
      return;
    }
    setState(() => _busy = true);
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
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
      }
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
            Container(
              width: double.infinity,
              height: 180,
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
                    left: 16,
                    top: 16,
                    child: IconButton(
                      icon: const Icon(Icons.arrow_back, color: Colors.white, size: 20),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ),
                  const Center(
                    child: Text('Debit Card top-up',
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
                  ),
                ],
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Amount',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: WeretTokens.textSecondary)),
                    const SizedBox(height: 6),
                    Container(
                      height: 50,
                      decoration: BoxDecoration(
                        border: Border.all(color: WeretTokens.border),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: TextField(
                        controller: _amountCtrl,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          hintText: '0.00',
                          hintStyle: TextStyle(color: WeretTokens.textMuted, fontSize: 14),
                          border: InputBorder.none,
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text('Select account',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: WeretTokens.textSecondary)),
                    const SizedBox(height: 6),
                    DropdownButtonFormField<String>(
                      value: _selectedAccountId,
                      decoration: InputDecoration(
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                      ),
                      hint: const Text('Choose one', style: TextStyle(color: WeretTokens.textMuted)),
                      items: accounts.map((a) {
                        final id = walletAccountId(a);
                        final label = a['label']?.toString() ?? walletTypeLabel('${a['walletType'] ?? ''}');
                        return DropdownMenuItem(value: id, child: Text(label));
                      }).toList(),
                      onChanged: (v) => setState(() => _selectedAccountId = v),
                    ),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(24),
              child: SizedBox(
                width: double.infinity,
                height: 55,
                child: FilledButton(
                  onPressed: (_busy || w.loading) ? null : _submit,
                  style: FilledButton.styleFrom(
                    backgroundColor: WeretTokens.brand,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                  ),
                  child: _busy
                      ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Confirm'),
                ),
              ),
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

  @override
  void dispose() {
    _amountCtrl.dispose();
    _otpCtrl.dispose();
    super.dispose();
  }

  Future<void> _request() async {
    final accountId = _selectedAccountId;
    if (accountId == null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('walletSelectAccount'.tr())));
      return;
    }
    final amount = num.tryParse(_amountCtrl.text.trim());
    if (amount == null || amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('walletEnterValidAmount'.tr())));
      return;
    }
    setState(() => _busy = true);
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
      if (mounted) {
        setState(() => _busy = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
      }
    }
  }

  Future<void> _confirm() async {
    final requestId = _requestId;
    final otp = _otpCtrl.text.trim();
    if (requestId == null || otp.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('walletEnterOtp'.tr())));
      return;
    }
    setState(() => _busy = true);
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
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
      }
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
            Container(
              width: double.infinity,
              height: 120,
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
                    left: 16,
                    top: 16,
                    child: IconButton(
                      icon: const Icon(Icons.arrow_back, color: Colors.white, size: 20),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ),
                  const Center(
                    child: Text('Transfer',
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
                  ),
                ],
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
                child: _step2 ? _buildOtpStep() : _buildRequestStep(accounts),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(24),
              child: SizedBox(
                width: double.infinity,
                height: 55,
                child: FilledButton(
                  onPressed: (_busy || w.loading) ? null : (_step2 ? _confirm : _request),
                  style: FilledButton.styleFrom(
                    backgroundColor: WeretTokens.brand,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                  ),
                  child: _busy
                      ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : Text(_step2 ? 'Confirm OTP' : 'Request Transfer'),
                ),
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
        const Text('Amount',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: WeretTokens.textSecondary)),
        const SizedBox(height: 6),
        Container(
          height: 50,
          decoration: BoxDecoration(
            border: Border.all(color: WeretTokens.border),
            borderRadius: BorderRadius.circular(12),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: TextField(
            controller: _amountCtrl,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              hintText: '0.00',
              hintStyle: TextStyle(color: WeretTokens.textMuted, fontSize: 14),
              border: InputBorder.none,
            ),
          ),
        ),
        const SizedBox(height: 16),
        const Text('From account',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: WeretTokens.textSecondary)),
        const SizedBox(height: 6),
        DropdownButtonFormField<String>(
          value: _selectedAccountId,
          decoration: InputDecoration(
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16),
          ),
          hint: const Text('Choose one', style: TextStyle(color: WeretTokens.textMuted)),
          items: accounts.map((a) {
            final id = walletAccountId(a);
            final label = a['label']?.toString() ?? walletTypeLabel('${a['walletType'] ?? ''}');
            return DropdownMenuItem(value: id, child: Text(label));
          }).toList(),
          onChanged: (v) => setState(() => _selectedAccountId = v),
        ),
      ],
    );
  }

  Widget _buildOtpStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Enter the OTP sent to your registered phone number',
          style: TextStyle(fontSize: 14, color: WeretTokens.textSecondary),
        ),
        const SizedBox(height: 24),
        const Text('OTP',
            style: TextStyle(fontSize: 12, color: WeretTokens.textMuted)),
        const SizedBox(height: 6),
        Container(
          height: 50,
          decoration: BoxDecoration(
            border: Border.all(color: WeretTokens.border),
            borderRadius: BorderRadius.circular(12),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: TextField(
            controller: _otpCtrl,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              hintText: 'Enter OTP',
              hintStyle: TextStyle(color: WeretTokens.textMuted, fontSize: 14),
              border: InputBorder.none,
            ),
          ),
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
        title: const Text('Wallet History', style: TextStyle(fontWeight: FontWeight.w600, color: Colors.black)),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: Colors.black),
          onPressed: () => context.pop(),
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
                            Text(w.transactionsError!, style: const TextStyle(color: Colors.red)),
                            const SizedBox(height: 12),
                            TextButton(
                              onPressed: () => ref.read(walletProvider.notifier).fetchTransactions(page: 1),
                              child: const Text('Retry'),
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
                          const Center(child: Text('No transactions', style: TextStyle(color: WeretTokens.textMuted))),
                        ],
                      )
                    : Column(
                        children: [
                          Expanded(
                            child: ListView.separated(
                              padding: const EdgeInsets.all(16),
                              itemCount: txs.length,
                              separatorBuilder: (_, __) => const SizedBox(height: 8),
                              itemBuilder: (_, i) {
                                final tx = Map<String, dynamic>.from(txs[i] as Map);
                                final type = '${tx['type'] ?? ''}';
                                final amt = tx['amount'] ?? 0;
                                final note = tx['note']?.toString() ?? '';
                                final created = tx['createdAt']?.toString() ?? '';
                                final isCredit = type == 'deposit' || type == 'ride_payment' || type == 'ride_refund';
                                return Container(
                                  padding: const EdgeInsets.all(14),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(color: WeretTokens.borderSubtle.withValues(alpha: 0.7)),
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
                                          color: isCredit ? Colors.green.shade700 : Colors.black,
                                        ),
                                      ),
                                    ],
                                  ),
                                );
                              },
                            ),
                          ),
                          if (pag.totalPages > 1)
                            Container(
                              decoration: BoxDecoration(
                                color: Colors.white,
                                border: Border(top: BorderSide(color: WeretTokens.borderSubtle)),
                              ),
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  TextButton.icon(
                                    onPressed: pag.hasPrev
                                        ? () => ref.read(walletProvider.notifier).fetchTransactions(page: pag.page - 1)
                                        : null,
                                    icon: const Icon(Icons.chevron_left, size: 20),
                                    label: const Text('Previous'),
                                  ),
                                  Text('${pag.page} / ${pag.totalPages}',
                                      style: const TextStyle(color: WeretTokens.textSecondary, fontSize: 13)),
                                  TextButton.icon(
                                    onPressed: pag.hasNext
                                        ? () => ref.read(walletProvider.notifier).fetchTransactions(page: pag.page + 1)
                                        : null,
                                    icon: const Icon(Icons.chevron_right, size: 20),
                                    label: const Text('Next'),
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

// ────────────────────────────────────────────────────────────
//  WalletAddAccountScreen (preserved, minor style update)
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
        Navigator.pop(context);
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
    return Scaffold(
      backgroundColor: WeretTokens.bg,
      appBar: AppBar(
        title: const Text('Add Payment Method', style: TextStyle(fontWeight: FontWeight.w600, color: Colors.black)),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: Colors.black),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: WeretTokens.borderSubtle.withValues(alpha: 0.7)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Select type', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  initialValue: _type,
                  decoration: InputDecoration(
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  items: _walletTypes.map((t) => DropdownMenuItem(value: t, child: Text(walletTypeLabel(t)))).toList(),
                  onChanged: (v) => setState(() => _type = v ?? 'cash'),
                ),
              ],
            ),
          ),
          if (_type != 'cash') ...[
            const SizedBox(height: 16),
            Container(
              height: 50,
              decoration: BoxDecoration(
                border: Border.all(color: WeretTokens.border),
                borderRadius: BorderRadius.circular(12),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: TextField(
                controller: _phone,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  hintText: 'Phone number',
                  hintStyle: TextStyle(color: WeretTokens.textMuted, fontSize: 14),
                  border: InputBorder.none,
                ),
              ),
            ),
          ],
          const SizedBox(height: 16),
          Container(
            height: 50,
            decoration: BoxDecoration(
              border: Border.all(color: WeretTokens.border),
              borderRadius: BorderRadius.circular(12),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: TextField(
              controller: _label,
              decoration: const InputDecoration(
                hintText: 'Label (optional)',
                hintStyle: TextStyle(color: WeretTokens.textMuted, fontSize: 14),
                border: InputBorder.none,
              ),
            ),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            height: 55,
            child: FilledButton(
              onPressed: _busy ? null : _save,
              style: FilledButton.styleFrom(
                backgroundColor: WeretTokens.brand,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
              ),
              child: _busy
                  ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Save'),
            ),
          ),
        ],
      ),
    );
  }
}
