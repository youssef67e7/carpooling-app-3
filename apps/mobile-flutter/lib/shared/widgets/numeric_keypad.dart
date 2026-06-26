import 'package:flutter/material.dart';

class NumericKeypad extends StatelessWidget {
  final ValueChanged<String> onKeyTap;
  final VoidCallback onDelete;
  final VoidCallback? onConfirm;

  const NumericKeypad({
    super.key,
    required this.onKeyTap,
    required this.onDelete,
    this.onConfirm,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        _row(['1', '2', '3']),
        _row(['4', '5', '6']),
        _row(['7', '8', '9']),
        Row(
          children: [
            _key('.', flex: 1),
            _key('0', flex: 1),
            _key('⌫', flex: 1, onTap: onDelete),
          ],
        ),
        if (onConfirm != null)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                onPressed: onConfirm,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.black,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: const Text('Confirm', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
              ),
            ),
          ),
      ],
    );
  }

  Widget _row(List<String> keys) {
    return Row(
      children: keys.map((k) => _key(k)).toList(),
    );
  }

  Widget _key(String label, {int flex = 1, VoidCallback? onTap}) {
    return Expanded(
      flex: flex,
      child: Padding(
        padding: const EdgeInsets.all(4),
        child: SizedBox(
          height: 58,
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: onTap ?? () => onKeyTap(label),
              borderRadius: BorderRadius.circular(12),
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(12),
                ),
                alignment: Alignment.center,
                child: Text(
                  label,
                  style: TextStyle(
                    fontSize: label == '⌫' ? 20 : 24,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
