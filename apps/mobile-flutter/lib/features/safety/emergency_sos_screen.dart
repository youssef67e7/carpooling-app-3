import 'dart:async';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/weret_tokens.dart';
import 'safety_provider.dart';

class EmergencySosScreen extends ConsumerStatefulWidget {
  const EmergencySosScreen({super.key, this.rideId, this.onResolved});
  final String? rideId;
  final VoidCallback? onResolved;
  static const routePath = '/safety/emergency';

  @override
  ConsumerState<EmergencySosScreen> createState() => _EmergencySosScreenState();
}

class _EmergencySosScreenState extends ConsumerState<EmergencySosScreen> {
  bool _activated = false;
  bool _resolving = false;
  String? _eventId;
  int _countdown = 10;
  Timer? _countdownTimer;

  @override
  void dispose() {
    _countdownTimer?.cancel();
    super.dispose();
  }

  void _startCountdown() {
    setState(() => _countdown = 5);
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_countdown <= 1) {
        t.cancel();
        _triggerSos();
      } else {
        setState(() => _countdown -= 1);
      }
    });
  }

  Future<void> _triggerSos() async {
    try {
      final svc = ref.read(safetyServiceProvider);
      final eventId = await svc.triggerSos(rideId: widget.rideId);
      setState(() { _activated = true; _eventId = eventId; });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('sosFailed'.tr())));
      }
    }
  }

  Future<void> _resolve() async {
    if (_eventId == null) return;
    setState(() => _resolving = true);
    try {
      await ref.read(safetyServiceProvider).resolveSos(_eventId!);
      widget.onResolved?.call();
      if (mounted) context.pop();
    } catch (_) {
      if (mounted) context.pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _activated ? WeretTokens.error : WeretTokens.bg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(icon: const Icon(Icons.close, color: Colors.white), onPressed: () => context.pop()),
      ),
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  _activated ? Icons.warning_rounded : Icons.sos,
                  size: 80,
                  color: _activated ? Colors.white : WeretTokens.error,
                ),
                const SizedBox(height: 24),
                Text(
                  _activated ? 'sosActivated'.tr() : 'sosTitle'.tr(),
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w800,
                    color: _activated ? Colors.white : WeretTokens.textPrimary,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 12),
                Text(
                  _activated ? 'sosActivatedBody'.tr() : 'sosBody'.tr(),
                  style: TextStyle(
                    fontSize: 16,
                    color: _activated ? Colors.white70 : WeretTokens.textSecondary,
                    height: 1.4,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 40),
                if (!_activated && !_resolving) ...[
                  SizedBox(
                    width: 200,
                    height: 200,
                    child: ElevatedButton(
                      onPressed: _countdown < 5 ? null : _startCountdown,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: WeretTokens.error,
                        foregroundColor: Colors.white,
                        shape: const CircleBorder(),
                        elevation: 8,
                      ),
                      child: _countdown < 5
                          ? Text('$_countdown', style: const TextStyle(fontSize: 64, fontWeight: FontWeight.w900))
                          : const Text('SOS', style: TextStyle(fontSize: 36, fontWeight: FontWeight.w900, letterSpacing: 4)),
                    ),
                  ),
                  if (_countdown < 5) ...[
                    const SizedBox(height: 16),
                    Text('sosCountdown'.tr(namedArgs: {'sec': '$_countdown'}), style: const TextStyle(color: WeretTokens.textSecondary)),
                  ],
                ],
                if (_activated) ...[
                  const SizedBox(height: 24),
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Column(
                      children: [
                        Icon(Icons.check_circle, color: Colors.white, size: 48),
                        SizedBox(height: 12),
                        Text(
                          'Your location and ride details have been shared with your trusted contacts.',
                          style: TextStyle(color: Colors.white, fontSize: 14, height: 1.4),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: _resolving ? null : _resolve,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: WeretTokens.error,
                      padding: const EdgeInsets.symmetric(horizontal: 48, vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: Text(_resolving ? 'Please wait...' : 'sosResolve'.tr(), style: const TextStyle(fontWeight: FontWeight.w700)),
                  ),
                ],
                if (!_activated) ...[
                  const SizedBox(height: 32),
                  Text('sosDisclaimer'.tr(), style: TextStyle(fontSize: 12, color: WeretTokens.textMuted), textAlign: TextAlign.center),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
