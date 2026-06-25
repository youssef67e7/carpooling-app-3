import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:firebase_core/firebase_core.dart';
import 'app.dart';
import 'core/services/debug_logger.dart';

final DebugLogger _log = DebugLogger.instance;

void main() {
  FlutterError.onError = (FlutterErrorDetails details) {
    FlutterError.presentError(details);
    _log.error('FLUTTER', details.exceptionAsString(), error: details.exception, stack: details.stack);
  };

  runZonedGuarded(
    () async {
      WidgetsFlutterBinding.ensureInitialized();
      await _log.init();
      await Firebase.initializeApp();
      await EasyLocalization.ensureInitialized();
      _log.info('APP', 'Firebase + Localization initialized');
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
      _log.error('UNCAUGHT', error.toString(), error: error, stack: stack);
    },
  );
}
