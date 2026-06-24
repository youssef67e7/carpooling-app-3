import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/wallet_provider.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/theme/weret_tokens.dart';
import '../../shared/widgets/custom_button.dart';

class DriverTopUpAmountScreen extends ConsumerStatefulWidget {
  const DriverTopUpAmountScreen({super.key});

  @override
  ConsumerState<DriverTopUpAmountScreen> createState() => _DriverTopUpAmountScreenState();
}

class _DriverTopUpAmountScreenState extends ConsumerState<DriverTopUpAmountScreen> {
  String _amount = '0';

  void _tapKey(String key) {
    setState(() {
      if (key == 'back') {
        if (_amount.length > 1) {
          _amount = _amount.substring(0, _amount.length - 1);
        } else {
          _amount = '0';
        }
      } else if (key == '.') {
        if (!_amount.contains('.')) _amount = '$_amount.';
      } else {
        _amount = _amount == '0' ? key : '$_amount$key';
      }
    });
  }

  num get _parsed => num.tryParse(_amount) ?? 0;
  num get _fees => (_parsed * 0.02).clamp(0, 9999);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WeretTokens.brand,
      body: Column(
        children: [
          SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  IconButton(onPressed: () => context.pop(), icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white, size: 20)),
                  Text('driverDebitCardTopUp'.tr(), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 16)),
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('driverTopUpAmount'.tr(), style: const TextStyle(color: Colors.white70, fontSize: 13)),
                const SizedBox(height: 8),
                Text('EGP $_amount', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 40)),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Expanded(
            child: Container(
              width: double.infinity,
              decoration: const BoxDecoration(
                color: WeretTokens.bg,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  Row(
                    children: [
                      Text('driverServiceFees'.tr(), style: const TextStyle(fontWeight: FontWeight.w600)),
                      const Icon(Icons.info_outline, size: 16, color: WeretTokens.textSecondary),
                      const Spacer(),
                      Text('EGP ${_fees.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w800)),
                    ],
                  ),
                  const SizedBox(height: 16),
                  CustomButton(
                    title: 'confirm'.tr(),
                    onPressed: _parsed > 0 ? () => context.push('/driver/earnings/confirm-password', extra: {'amount': _parsed, 'fees': _fees}) : null,
                  ),
                  const Spacer(),
                  _Keypad(onTap: _tapKey),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Keypad extends StatelessWidget {
  const _Keypad({required this.onTap});
  final ValueChanged<String> onTap;

  @override
  Widget build(BuildContext context) {
    const keys = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['.', '0', 'back'],
    ];
    return Column(
      children: keys.map((row) {
        return Row(
          children: row.map((k) {
            return Expanded(
              child: Padding(
                padding: const EdgeInsets.all(4),
                child: Material(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(WeretTokens.fieldRadius),
                  child: InkWell(
                    onTap: () => onTap(k),
                    borderRadius: BorderRadius.circular(WeretTokens.fieldRadius),
                    child: SizedBox(
                      height: 52,
                      child: Center(
                        child: k == 'back'
                            ? const Icon(Icons.backspace_outlined)
                            : Text(k, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w600)),
                      ),
                    ),
                  ),
                ),
              ),
            );
          }).toList(),
        );
      }).toList(),
    );
  }
}

class DriverAddCardScreen extends StatefulWidget {
  const DriverAddCardScreen({super.key});

  @override
  State<DriverAddCardScreen> createState() => _DriverAddCardScreenState();
}

class _DriverAddCardScreenState extends State<DriverAddCardScreen> {
  final _name = TextEditingController();
  final _number = TextEditingController();
  final _expiry = TextEditingController();
  final _cvv = TextEditingController();
  String _type = 'visa';

  @override
  void dispose() {
    _name.dispose();
    _number.dispose();
    _expiry.dispose();
    _cvv.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WeretTokens.brand,
      appBar: AppBar(
        backgroundColor: WeretTokens.brand,
        foregroundColor: Colors.white,
        title: Text('driverAddNewCard'.tr()),
      ),
      body: Container(
        margin: const EdgeInsets.only(top: 8),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        padding: const EdgeInsets.all(20),
        child: ListView(
          children: [
            _field('driverCardholderName'.tr(), _name, 'John Doe'),
            _field('driverCardNumber'.tr(), _number, 'XXXX XXXX XXXX XXXX'),
            DropdownButtonFormField<String>(
              value: _type,
              decoration: InputDecoration(labelText: 'driverCardType'.tr(), border: OutlineInputBorder(borderRadius: BorderRadius.circular(12))),
              items: ['visa', 'mastercard'].map((t) => DropdownMenuItem(value: t, child: Text(t.toUpperCase()))).toList(),
              onChanged: (v) => setState(() => _type = v ?? 'visa'),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _field('driverExpiry'.tr(), _expiry, 'MM/YY')),
                const SizedBox(width: 12),
                Expanded(child: _field('driverCvv'.tr(), _cvv, 'XXX')),
              ],
            ),
            const SizedBox(height: 24),
            CustomButton(
              title: 'confirm'.tr(),
              onPressed: () => context.push('/driver/earnings/top-up'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _field(String label, TextEditingController c, String hint) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextField(
        controller: c,
        decoration: InputDecoration(labelText: label, hintText: hint, border: OutlineInputBorder(borderRadius: BorderRadius.circular(12))),
      ),
    );
  }
}

class DriverConfirmPasswordScreen extends ConsumerStatefulWidget {
  const DriverConfirmPasswordScreen({super.key, required this.amount, required this.fees});
  final num amount;
  final num fees;

  @override
  ConsumerState<DriverConfirmPasswordScreen> createState() => _DriverConfirmPasswordScreenState();
}

class _DriverConfirmPasswordScreenState extends ConsumerState<DriverConfirmPasswordScreen> {
  final _password = TextEditingController();
  bool _obscure = true;
  bool _busy = false;

  @override
  void dispose() {
    _password.dispose();
    super.dispose();
  }

  Future<void> _confirm() async {
    if (_password.text.length < 8) return;
    setState(() => _busy = true);
    try {
      await ref.read(authProvider.notifier).verifyPassword(_password.text);
      final accounts = ref.read(walletProvider).accounts;
      if (accounts.isEmpty) {
        await ref.read(walletProvider.notifier).createAccount('cash');
        await ref.read(walletProvider.notifier).fetchAccounts();
      }
      final acc = ref.read(walletProvider).accounts.first as Map;
      final id = '${acc['_id'] ?? acc['id']}';
      await ref.read(walletProvider.notifier).deposit(id, widget.amount);
      if (mounted) {
        context.go('/driver/earnings/success', extra: {'total': widget.amount + widget.fees});
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(backgroundColor: WeretTokens.brand, foregroundColor: Colors.white, title: Text('driverConfirmPassword'.tr())),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('driverConfirmPasswordHint'.tr(), style: const TextStyle(color: WeretTokens.textSecondary)),
            const SizedBox(height: 24),
            TextField(
              controller: _password,
              obscureText: _obscure,
              decoration: InputDecoration(
                labelText: 'password'.tr(),
                helperText: 'driverPasswordMin'.tr(),
                suffixIcon: IconButton(
                  icon: Icon(_obscure ? Icons.visibility : Icons.visibility_off),
                  onPressed: () => setState(() => _obscure = !_obscure),
                ),
                border: const UnderlineInputBorder(),
              ),
            ),
            const Spacer(),
            CustomButton(title: 'driverConfirmPassword'.tr(), loading: _busy, onPressed: _confirm),
          ],
        ),
      ),
    );
  }
}

class DriverTopUpSuccessScreen extends StatelessWidget {
  const DriverTopUpSuccessScreen({super.key, required this.total});
  final num total;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WeretTokens.brand,
      body: Center(
        child: Container(
          margin: const EdgeInsets.all(24),
          padding: const EdgeInsets.all(28),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: WeretTokens.brand, width: 3),
                ),
                child: const Icon(Icons.check, size: 32),
              ),
              const SizedBox(height: 16),
              Text('driverTopUpSuccess'.tr(), style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 22)),
              const SizedBox(height: 8),
              Text('driverTopUpSuccessBody'.tr(), textAlign: TextAlign.center, style: const TextStyle(color: WeretTokens.textSecondary)),
              const SizedBox(height: 20),
              Text('driverTotalPayment'.tr(), style: const TextStyle(color: WeretTokens.textSecondary)),
              Text('\$${total.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 32)),
              const SizedBox(height: 24),
              CustomButton(title: 'done'.tr(), onPressed: () => context.go('/driver/earnings')),
              TextButton(onPressed: () => context.go('/driver/earnings/top-up'), child: Text('driverPayAgain'.tr())),
            ],
          ),
        ),
      ),
    );
  }
}
