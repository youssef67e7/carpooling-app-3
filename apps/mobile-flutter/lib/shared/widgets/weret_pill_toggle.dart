import 'package:flutter/material.dart';
import '../../core/theme/weret_tokens.dart';

class WeretPillToggle<T> extends StatelessWidget {
  const WeretPillToggle({
    super.key,
    required this.value,
    required this.options,
    required this.onChanged,
    this.labelBuilder,
  });

  final T value;
  final List<T> options;
  final ValueChanged<T> onChanged;
  final String Function(T)? labelBuilder;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: options.map((opt) {
        final selected = opt == value;
        return Expanded(
          child: Padding(
            padding: EdgeInsets.only(right: opt != options.last ? 8 : 0),
            child: Material(
              color: selected ? WeretTokens.brand : WeretTokens.surface,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(WeretTokens.pillRadius),
                side: BorderSide(color: selected ? WeretTokens.brand : WeretTokens.border),
              ),
              child: InkWell(
                borderRadius: BorderRadius.circular(WeretTokens.pillRadius),
                onTap: () => onChanged(opt),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Text(
                    labelBuilder?.call(opt) ?? '$opt',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: selected ? Colors.white : WeretTokens.textPrimary,
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}

class WeretMapModeToggle extends StatelessWidget {
  const WeretMapModeToggle({
    super.key,
    required this.pickupSelected,
    required this.onPickup,
    required this.onDestination,
    required this.pickupLabel,
    required this.destinationLabel,
  });

  final bool pickupSelected;
  final VoidCallback onPickup;
  final VoidCallback onDestination;
  final String pickupLabel;
  final String destinationLabel;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _ModeChip(
            label: pickupLabel,
            dotColor: Colors.green,
            selected: pickupSelected,
            onTap: onPickup,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _ModeChip(
            label: destinationLabel,
            dotColor: WeretTokens.brand,
            selected: !pickupSelected,
            onTap: onDestination,
          ),
        ),
      ],
    );
  }
}

class _ModeChip extends StatelessWidget {
  const _ModeChip({
    required this.label,
    required this.dotColor,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final Color dotColor;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? WeretTokens.inputFill : WeretTokens.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: selected ? WeretTokens.border : WeretTokens.brand.withValues(alpha: 0.35)),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(width: 8, height: 8, decoration: BoxDecoration(color: dotColor, shape: BoxShape.circle)),
              const SizedBox(width: 8),
              Flexible(child: Text(label, style: const TextStyle(fontWeight: FontWeight.w600), overflow: TextOverflow.ellipsis)),
            ],
          ),
        ),
      ),
    );
  }
}

class WeretStackOption extends StatelessWidget {
  const WeretStackOption({
    super.key,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? WeretTokens.brand : WeretTokens.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: WeretTokens.border.withValues(alpha: 0.8)),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontWeight: FontWeight.w600,
              color: selected ? Colors.white : WeretTokens.textPrimary,
            ),
          ),
        ),
      ),
    );
  }
}
