import 'package:flutter/material.dart';
import '../../core/theme/weret_tokens.dart';

class AppBottomSheet {
  AppBottomSheet._();

  static Future<T?> show<T>(BuildContext context, {required Widget child, bool draggable = true}) {
    return showModalBottomSheet<T>(
      context: context,
      isScrollControlled: true,
      enableDrag: draggable,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _SheetWrapper(child: child),
    );
  }

  static Future<T?> showDraggable<T>(BuildContext context, {required Widget child}) {
    return showModalBottomSheet<T>(
      context: context,
      isScrollControlled: true,
      enableDrag: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => DraggableScrollableSheet(
        initialChildSize: 0.5,
        minChildSize: 0.25,
        maxChildSize: 0.9,
        expand: false,
        builder: (_, scrollController) => _SheetWrapper(
          child: SingleChildScrollView(
            controller: scrollController,
            child: child,
          ),
        ),
      ),
    );
  }
}

class _SheetWrapper extends StatelessWidget {
  final Widget child;

  const _SheetWrapper({required this.child});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 12, 24, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 36,
            height: 4,
            decoration: BoxDecoration(
              color: WeretTokens.borderSubtle,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 20),
          child,
        ],
      ),
    );
  }
}
