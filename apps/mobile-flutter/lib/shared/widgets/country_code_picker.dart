import 'package:flutter/material.dart';
import '../../core/theme/weret_tokens.dart';

class CountryCode {
  final String code;
  final String dialCode;
  final String flag;

  const CountryCode({
    required this.code,
    required this.dialCode,
    required this.flag,
  });
}

const kDefaultCountries = [
  CountryCode(code: 'US', dialCode: '+1', flag: '\u{1F1FA}\u{1F1F8}'),
  CountryCode(code: 'GB', dialCode: '+44', flag: '\u{1F1EC}\u{1F1E7}'),
  CountryCode(code: 'EG', dialCode: '+20', flag: '\u{1F1EA}\u{1F1EC}'),
  CountryCode(code: 'SA', dialCode: '+966', flag: '\u{1F1F8}\u{1F1E6}'),
  CountryCode(code: 'AE', dialCode: '+971', flag: '\u{1F1E6}\u{1F1EA}'),
  CountryCode(code: 'IN', dialCode: '+91', flag: '\u{1F1EE}\u{1F1F3}'),
  CountryCode(code: 'CA', dialCode: '+1', flag: '\u{1F1E8}\u{1F1E6}'),
  CountryCode(code: 'AU', dialCode: '+61', flag: '\u{1F1E6}\u{1F1FA}'),
  CountryCode(code: 'DE', dialCode: '+49', flag: '\u{1F1E9}\u{1F1EA}'),
  CountryCode(code: 'FR', dialCode: '+33', flag: '\u{1F1EB}\u{1F1F7}'),
];

class CountryCodeSelector extends StatelessWidget {
  final CountryCode selected;
  final ValueChanged<CountryCode> onChanged;
  final List<CountryCode> countries;

  const CountryCodeSelector({
    super.key,
    required this.selected,
    required this.onChanged,
    this.countries = kDefaultCountries,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => _showPicker(context),
      borderRadius: BorderRadius.circular(WeretTokens.fieldRadius),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
        decoration: BoxDecoration(
          color: WeretTokens.inputFill,
          borderRadius: BorderRadius.circular(WeretTokens.fieldRadius),
          border: Border.all(color: WeretTokens.borderSubtle),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(selected.flag, style: const TextStyle(fontSize: 20)),
            const SizedBox(width: 6),
            Text(selected.dialCode, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
            const SizedBox(width: 4),
            const Icon(Icons.arrow_drop_down, size: 18, color: WeretTokens.textMuted),
          ],
        ),
      ),
    );
  }

  void _showPicker(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(width: 36, height: 4, decoration: BoxDecoration(color: WeretTokens.borderSubtle, borderRadius: BorderRadius.circular(2))),
              const SizedBox(height: 16),
              Text('Select country', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
              const SizedBox(height: 12),
              ...countries.map((c) => ListTile(
                    leading: Text(c.flag, style: const TextStyle(fontSize: 24)),
                    title: Text('${c.code} (${c.dialCode})'),
                    trailing: c.code == selected.code ? const Icon(Icons.check, size: 18) : null,
                    onTap: () {
                      onChanged(c);
                      Navigator.pop(context);
                    },
                  )),
            ],
          ),
        );
      },
    );
  }
}
