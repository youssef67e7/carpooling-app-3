import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../../core/theme/weret_tokens.dart';

class AdminPulsingShield extends StatefulWidget {
  const AdminPulsingShield({super.key, this.size = 56});

  final double size;

  @override
  State<AdminPulsingShield> createState() => _AdminPulsingShieldState();
}

class _AdminPulsingShieldState extends State<AdminPulsingShield> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 2200))..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final t = _controller.value;
        final pulse = 0.5 + 0.5 * math.sin(t * math.pi * 2);
        return Stack(
          alignment: Alignment.center,
          children: [
            Container(
              width: widget.size + 24 * pulse,
              height: widget.size + 24 * pulse,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.08 + 0.06 * pulse),
              ),
            ),
            Container(
              width: widget.size,
              height: widget.size,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Colors.white.withValues(alpha: 0.22),
                    Colors.white.withValues(alpha: 0.06),
                  ],
                ),
                border: Border.all(color: Colors.white.withValues(alpha: 0.35)),
              ),
              child: Icon(Icons.shield_moon_outlined, color: Colors.white.withValues(alpha: 0.95), size: widget.size * 0.48),
            ),
          ],
        );
      },
    );
  }
}

class AdminGlassStatTile extends StatelessWidget {
  const AdminGlassStatTile({
    super.key,
    required this.label,
    required this.value,
    required this.icon,
    this.accent = Colors.white,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        color: Colors.white.withValues(alpha: 0.12),
        border: Border.all(color: Colors.white.withValues(alpha: 0.18)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: accent.withValues(alpha: 0.9), size: 20),
          const Spacer(),
          Text(value, style: TextStyle(color: accent, fontWeight: FontWeight.w900, fontSize: 24, height: 1.1)),
          const SizedBox(height: 4),
          Text(label, style: TextStyle(color: accent.withValues(alpha: 0.72), fontSize: 11, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

/// Light KPI card — Savora-style layout with WERET brand colors.
class AdminKpiCard extends StatelessWidget {
  const AdminKpiCard({
    super.key,
    required this.label,
    required this.value,
    required this.icon,
    this.tone = AdminKpiTone.brand,
    this.alert = false,
  });

  final String label;
  final String value;
  final IconData icon;
  final AdminKpiTone tone;
  final bool alert;

  Color get _iconBg {
    switch (tone) {
      case AdminKpiTone.green:
        return WeretTokens.success.withValues(alpha: 0.12);
      case AdminKpiTone.gray:
        return WeretTokens.textSecondary.withValues(alpha: 0.12);
      case AdminKpiTone.brand:
        return WeretTokens.brand.withValues(alpha: 0.1);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 168,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: alert ? const Color(0xFFFFF8F8) : WeretTokens.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: alert ? WeretTokens.error.withValues(alpha: 0.35) : WeretTokens.border.withValues(alpha: 0.65)),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 12, offset: const Offset(0, 4))],
      ),
      child: Row(
        children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(color: _iconBg, borderRadius: BorderRadius.circular(14)),
            child: Icon(icon, color: WeretTokens.brand, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(value, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 22, height: 1.05, color: WeretTokens.textPrimary)),
                const SizedBox(height: 2),
                Text(label, style: const TextStyle(color: WeretTokens.textSecondary, fontSize: 11, fontWeight: FontWeight.w600), maxLines: 2),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

enum AdminKpiTone { brand, green, gray }

class AdminQuickChip extends StatelessWidget {
  const AdminQuickChip({
    super.key,
    required this.icon,
    required this.label,
    required this.onTap,
    this.badge,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final int? badge;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: WeretTokens.surface,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Container(
          width: 108,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: WeretTokens.border.withValues(alpha: 0.65)),
            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 10, offset: const Offset(0, 4))],
          ),
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: WeretTokens.brand,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(icon, color: Colors.white, size: 18),
                  ),
                  const SizedBox(height: 10),
                  Text(label, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12, height: 1.2)),
                ],
              ),
              if (badge != null && badge! > 0)
                Positioned(
                  top: -4,
                  right: -4,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(color: WeretTokens.error, borderRadius: BorderRadius.circular(999)),
                    child: Text(badge! > 99 ? '99+' : '$badge', style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w900)),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
