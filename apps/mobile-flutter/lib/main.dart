import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import 'app.dart';

void main() {
  FlutterError.onError = (FlutterErrorDetails details) {
    FlutterError.presentError(details);
    debugPrint('');
    debugPrint('🔥 FLUTTER ERROR');
    debugPrint(details.exceptionAsString());
    debugPrint(details.stack.toString());
  };

  runZonedGuarded(
    () async {
      WidgetsFlutterBinding.ensureInitialized();
      await EasyLocalization.ensureInitialized();
      runApp(
        EasyLocalization(
          supportedLocales: const [Locale('en'), Locale('ar')],
          path: 'lib/l10n',
          fallbackLocale: const Locale('en'),
          child: const ProviderScope(child: WeretApp()),
        ),
      );
    },
    (error, stack) {
      debugPrint('');
      debugPrint('💥 UNCAUGHT ERROR');
      debugPrint(error.toString());
      debugPrint(stack.toString());
    },
  );
}
