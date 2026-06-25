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

  // ── Text ──
  static const textPrimary = AppColors.textPrimary;
  static const textSecondary = AppColors.textSecondary;
  static const textMuted = AppColors.textMuted;

  // ── Status ──
  static const success = AppColors.success;
  static const error = AppColors.error;
  static const successSoft = Color(0xFFDCFCE7);
  static const onSuccess = Color(0xFF166534);
  static const dangerSoft = Color(0xFFFEE2E2);
  static const brandSurface = Color(0x14000000);

  // ── Role tints ──
  static const passengerAccent = brand;
  static const driverAccent = brand;

  // ── Borders ──
  static const border = AppColors.borderMedium;
  static const borderSubtle = AppColors.borderLight;

  // ── Radii ──
  static const pillRadius = 999.0;
  static const fieldRadius = 12.0;
  static const cardRadius = 20.0;
  static const hPad = 24.0;

  // ── Typography (legacy; prefer AppStyles) ──
  static const wordmarkStyle = TextStyle(
    fontSize: 34,
    fontWeight: FontWeight.w800,
    letterSpacing: 1.0,
    color: textPrimary,
  );
}
