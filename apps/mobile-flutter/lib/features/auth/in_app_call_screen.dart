import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:easy_localization/easy_localization.dart';

import '../../core/theme/weret_tokens.dart';
import '../../shared/widgets/ui/pressable_scale.dart';

const _xl = 48.0;
const _lg = 32.0;
const _sm = 8.0;

class InAppCallScreen extends StatefulWidget {
  final String rideId;
  const InAppCallScreen({super.key, required this.rideId});

  @override
  State<InAppCallScreen> createState() => _InAppCallScreenState();
}

class _InAppCallScreenState extends State<InAppCallScreen> {
  bool _calling = false;
  bool _connected = false;
  bool _ended = false;

  void _startCall() {
    HapticFeedback.mediumImpact();
    setState(() => _calling = true);
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) setState(() => _connected = true);
    });
  }

  void _endCall() {
    HapticFeedback.mediumImpact();
    if (_calling) setState(() => _ended = true);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WeretTokens.brand,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(_lg),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                CircleAvatar(
                  radius: _xl,
                  backgroundColor: Colors.white.withValues(alpha: 0.15),
                  child: Icon(
                    _connected ? Icons.headset_mic : Icons.phone_in_talk,
                    size: _xl, color: Colors.white,
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  _ended ? 'callEnded'.tr() : _connected ? 'callConnected'.tr() : _calling ? 'callCalling'.tr() : 'inAppVoiceCall'.tr(),
                  style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w700),
                ),
                if (_calling && !_connected && !_ended) ...[
                  const SizedBox(height: _sm + 4),
                  Text('callRinging'.tr(), style: TextStyle(color: Colors.white.withValues(alpha: 0.6), fontSize: 15)),
                ],
                const SizedBox(height: _xl),
                if (!_ended)
                  _CallAction(
                    icon: _calling ? Icons.call_end : Icons.phone,
                    label: _calling ? 'endCall'.tr() : 'callCalling'.tr(),
                    color: _calling ? WeretTokens.error : WeretTokens.success,
                    onTap: _calling ? _endCall : _startCall,
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _CallAction extends StatelessWidget {
  const _CallAction({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return PressableScale(
      scale: 0.92,
      haptic: true,
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircleAvatar(
            radius: _lg, backgroundColor: color,
            child: Icon(icon, color: Colors.white),
          ),
          const SizedBox(height: _sm),
          Text(label, style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 12)),
        ],
      ),
    );
  }
}
