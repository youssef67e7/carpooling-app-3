import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'weret_tokens.dart';

/// Separates passenger vs driver auth/onboarding visuals without mixing flows.
enum AuthFlow { neutral, passenger, driver }

extension AuthFlowX on AuthFlow {
  String get badgeLabel => switch (this) {
        AuthFlow.passenger => 'authFlowPassenger'.tr(),
        AuthFlow.driver => 'authFlowDriver'.tr(),
        AuthFlow.neutral => '',
      };

  Color get accent => WeretTokens.brand;

  Color get accentSurface => WeretTokens.brand.withValues(alpha: 0.08);

  bool get showBadge => this != AuthFlow.neutral;
}
