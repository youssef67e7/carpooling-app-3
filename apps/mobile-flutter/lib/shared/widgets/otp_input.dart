import 'package:flutter/material.dart';
import '../../core/theme/weret_tokens.dart';

class OtpInput extends StatefulWidget {
  final int length;
  final ValueChanged<String> onCompleted;
  final ValueChanged<String>? onChanged;

  const OtpInput({
    super.key,
    this.length = 4,
    required this.onCompleted,
    this.onChanged,
  });

  @override
  State<OtpInput> createState() => _OtpInputState();
}

class _OtpInputState extends State<OtpInput> {
  final _controllers = <TextEditingController>[];
  final _focusNodes = <FocusNode>[];

  @override
  void initState() {
    super.initState();
    for (var i = 0; i < widget.length; i++) {
      _controllers.add(TextEditingController());
      _focusNodes.add(FocusNode());
    }
  }

  @override
  void dispose() {
    for (final c in _controllers) {
      c.dispose();
    }
    for (final f in _focusNodes) {
      f.dispose();
    }
    super.dispose();
  }

  void _onChanged(String value, int index) {
    if (value.length > 1) {
      for (var i = 0; i < widget.length && i < value.length; i++) {
        _controllers[i].text = value[i];
      }
      _focusNodes[widget.length - 1].unfocus();
      _emitCompleted();
      return;
    }

    if (value.isEmpty && index > 0) {
      _controllers[index - 1].clear();
      _focusNodes[index - 1].requestFocus();
    } else if (value.isNotEmpty && index < widget.length - 1) {
      _focusNodes[index + 1].requestFocus();
    } else if (value.isNotEmpty && index == widget.length - 1) {
      _focusNodes[index].unfocus();
      _emitCompleted();
    }

    widget.onChanged?.call(_allValues());
  }

  String _allValues() => _controllers.map((c) => c.text).join();

  void _emitCompleted() {
    final code = _allValues();
    if (code.length == widget.length) {
      widget.onCompleted(code);
    }
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final gap = 6.0;
        final totalGap = gap * (widget.length - 1);
        final boxSize = ((constraints.maxWidth - totalGap) / widget.length).clamp(44.0, 64.0);
        return Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(widget.length, (i) {
            return Container(
              width: boxSize,
              height: boxSize,
              margin: EdgeInsets.only(
                left: i == 0 ? 0 : gap,
              ),
              child: TextField(
                controller: _controllers[i],
                focusNode: _focusNodes[i],
                keyboardType: TextInputType.number,
                textAlign: TextAlign.center,
                maxLength: 1,
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
                decoration: InputDecoration(
                  counterText: '',
                  filled: true,
                  fillColor: WeretTokens.inputFill,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: WeretTokens.borderSubtle),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: WeretTokens.borderSubtle),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: WeretTokens.brand, width: 1.5),
                  ),
                ),
                onChanged: (v) => _onChanged(v, i),
                onTapOutside: (_) => FocusScope.of(context).unfocus(),
              ),
            );
          }),
        );
      },
    );
  }
}
