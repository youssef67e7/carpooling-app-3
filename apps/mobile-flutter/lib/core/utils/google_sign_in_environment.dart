import 'dart:io';
import 'package:flutter/foundation.dart';

class GoogleSignInEnvironment {
  const GoogleSignInEnvironment._();

  static bool get isWeb => kIsWeb;
  static bool get isAndroid => !kIsWeb && Platform.isAndroid;
  static bool get isIOS => !kIsWeb && Platform.isIOS;

  static String get platform {
    if (isWeb) return 'web';
    if (isAndroid) return 'android';
    if (isIOS) return 'ios';
    return 'unknown';
  }
}
