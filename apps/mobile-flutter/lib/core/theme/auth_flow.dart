import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'app_colors.dart';

/// Separates passenger vs driver auth/onboarding visuals without mixing flows.
enum AuthFlow { neutral, passenger, driver }

extension AuthFlowX on AuthFlow {
  String get badgeLabel => switch (this) {
        AuthFlow.passenger => 'authFlowPassenger'.tr(),
        AuthFlow.driver => 'authFlowDriver'.tr(),
        AuthFlow.neutral => '',
      };

  Color get accent => AppColors.primary;

  Color get accentSurface => AppColors.primary.withValues(alpha: 0.08);

  bool get showBadge => this != AuthFlow.neutral;
}
