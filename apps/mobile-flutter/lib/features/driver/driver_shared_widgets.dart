import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import '../../core/theme/weret_tokens.dart';
import '../../shared/widgets/weret_logo.dart';

class DriverWordmark extends StatelessWidget {
  const DriverWordmark({super.key});
  @override
  Widget build(BuildContext context) =>
      const Center(child: WeretLogo.onLight());
}

class DriverFormCard extends StatelessWidget {
  const DriverFormCard(
      {super.key,
      required this.icon,
      required this.title,
      required this.child});
  final IconData icon;
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: WeretTokens.surface,
        borderRadius: BorderRadius.circular(WeretTokens.cardRadius),
        border: Border.all(color: WeretTokens.border.withValues(alpha: 0.6)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Icon(icon, size: 20, color: WeretTokens.brand),
              const SizedBox(width: 8),
              Text(title,
                  style: const TextStyle(
                      fontWeight: FontWeight.w800, fontSize: 15)),
            ],
          ),
          const SizedBox(height: 14),
          child,
        ],
      ),
    );
  }
}

class DriverStatChip extends StatelessWidget {
  const DriverStatChip(
      {super.key, required this.label, required this.value, this.trailing});
  final String label;
  final String value;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
        decoration: BoxDecoration(
          color: WeretTokens.surface,
          borderRadius: BorderRadius.circular(WeretTokens.cardRadius),
          border: Border.all(color: WeretTokens.border.withValues(alpha: 0.5)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label,
                style: const TextStyle(
                    fontSize: 11,
                    color: WeretTokens.textSecondary,
                    fontWeight: FontWeight.w600)),
            const SizedBox(height: 6),
            Row(
              children: [
                Expanded(
                    child: Text(value,
                        style: const TextStyle(
                            fontWeight: FontWeight.w800, fontSize: 15))),
                if (trailing != null) trailing!,
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class DriverTimelineStep extends StatelessWidget {
  const DriverTimelineStep({
    super.key,
    required this.title,
    required this.subtitle,
    required this.status,
    required this.isLast,
    this.active = false,
  });

  final String title;
  final String subtitle;
  final String status;
  final bool isLast;
  final bool active;

  Color get _dotColor {
    if (status == 'completed' || status == 'verified')
      return WeretTokens.success;
    if (status == 'under_review') return WeretTokens.brandSoft;
    return WeretTokens.border;
  }

  Color get _badgeBg {
    if (status == 'completed' || status == 'verified')
      return WeretTokens.successSoft;
    if (status == 'under_review') return WeretTokens.ambient;
    return WeretTokens.inputFill;
  }

  Color get _badgeFg {
    if (status == 'completed' || status == 'verified')
      return WeretTokens.onSuccess;
    if (status == 'under_review') return WeretTokens.textPrimary;
    return WeretTokens.textSecondary;
  }

  @override
  Widget build(BuildContext context) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Column(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration:
                    BoxDecoration(color: _dotColor, shape: BoxShape.circle),
                child: Icon(
                  status == 'completed' || status == 'verified'
                      ? Icons.check
                      : status == 'under_review'
                          ? Icons.schedule
                          : Icons.lock_outline,
                  size: 14,
                  color: Colors.white,
                ),
              ),
              if (!isLast)
                Expanded(
                  child: Container(
                      width: 2,
                      color: WeretTokens.border.withValues(alpha: 0.6)),
                ),
            ],
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: isLast ? 0 : 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Expanded(
                          child: Text(title,
                              style: const TextStyle(
                                  fontWeight: FontWeight.w800, fontSize: 15))),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                            color: _badgeBg,
                            borderRadius: BorderRadius.circular(999)),
                        child: Text(
                          'driverStepStatus_$status'.tr(),
                          style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: _badgeFg),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(subtitle,
                      style: const TextStyle(
                          color: WeretTokens.textSecondary,
                          fontSize: 13,
                          height: 1.35)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class DriverInfoBanner extends StatelessWidget {
  const DriverInfoBanner({super.key, required this.text});
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: WeretTokens.ambient,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.info_outline, size: 18, color: WeretTokens.brand),
          const SizedBox(width: 8),
          Expanded(
              child: Text(text,
                  style: const TextStyle(
                      fontSize: 12,
                      height: 1.4,
                      color: WeretTokens.textSecondary))),
        ],
      ),
    );
  }
}

class DriverVehicleTypeCard extends StatelessWidget {
  const DriverVehicleTypeCard({
    super.key,
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 4),
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            color: WeretTokens.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
                color: selected ? WeretTokens.brand : WeretTokens.border,
                width: selected ? 2 : 1),
          ),
          child: Column(
            children: [
              Icon(icon,
                  color:
                      selected ? WeretTokens.brand : WeretTokens.textSecondary),
              const SizedBox(height: 6),
              Text(label,
                  style: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: selected
                          ? WeretTokens.brand
                          : WeretTokens.textSecondary)),
            ],
          ),
        ),
      ),
    );
  }
}
