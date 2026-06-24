import 'package:flutter/material.dart';

Future<void> showAlert(BuildContext context, String title, String message) {
  return showDialog(
    context: context,
    builder: (c) => AlertDialog(
      title: Text(title),
      content: Text(message),
      actions: [TextButton(onPressed: () => Navigator.pop(c), child: const Text('OK'))],
    ),
  );
}
