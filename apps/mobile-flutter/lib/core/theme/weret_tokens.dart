import 'package:flutter/material.dart';

import 'app_colors.dart';

/// Design tokens – remapped to [AppColors] spec.
class WeretTokens {
  WeretTokens._();

  // ── Base ──
  static const bg = AppColors.secondary;
  static const ambient = Color(0xFFF3F3F4);
  static const surface = AppColors.secondary;
  static const inputFill = AppColors.inputBackground;
  static const brand = AppColors.primary;
  static const brandHover = Color(0xFF1A1B1F);
  static const brandSoft = Color(0xFF52525B);
  static const blue = AppColors.primaryBlue;

  // ── Text ──
  static const textPrimary = AppColors.textPrimary;
  static const textSecondary = AppColors.textSecondary;
  static const textMuted = AppColors.textMuted;

  // ── Accent / Brand highlights ──
  static const accent = AppColors.accent;

  // ── Status ──
  static const success = AppColors.success;
  static const error = AppColors.error;
  static const successSoft = Color(0xFFDCFCE7);
  static const onSuccess = Color(0xFF166534);
  static const dangerSoft = Color(0xFFFEE2E2);
  static const onError = Color(0xFFBA1A1A);
  static const warningSoft = Color(0xFFFEF3C7);
  static const onWarning = Color(0xFF92400E);
  static const infoSoft = Color(0xFFDBEAFE);
  static const onInfo = AppColors.primaryBlue;
  static const neutralSoft = Color(0xFFF2F3FD);
  static const onNeutral = Color(0xFF414753);
  static const brandSurface = Color(0x14000000);

  // ── Role tints ──
  static const passengerAccent = brand;
  static const driverAccent = brand;

  // ── Premium / Surge ──
  static const premium = AppColors.premiumOrange;
  static const premiumLight = AppColors.premiumOrangeLight;

  // ── Borders ──
  static const border = AppColors.borderMedium;
  static const borderSubtle = AppColors.borderLight;

  // ── Radii ──
  static const pillRadius = 999.0;
  static const fieldRadius = 12.0;
  static const cardRadius = 20.0;
  static const hPad = 24.0;

  // ── Spacing ──
  static const sp2 = 2.0;
  static const sp4 = 4.0;
  static const sp6 = 6.0;
  static const sp8 = 8.0;
  static const sp10 = 10.0;
  static const sp12 = 12.0;
  static const sp14 = 14.0;
  static const sp16 = 16.0;
  static const sp20 = 20.0;
  static const sp24 = 24.0;
  static const sp32 = 32.0;
  static const sp40 = 40.0;
  static const sp48 = 48.0;
  static const sp60 = 60.0;

  // ── Typography (legacy; prefer AppStyles) ──
  static const wordmarkStyle = TextStyle(
    fontSize: 34,
    fontWeight: FontWeight.w800,
    letterSpacing: 1.0,
    color: textPrimary,
  );
}
