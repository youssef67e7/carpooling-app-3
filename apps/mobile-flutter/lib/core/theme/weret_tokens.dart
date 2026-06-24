import 'package:flutter/material.dart';

/// Design tokens aligned with web admin (`apps/web/styles.css` :root).
class WeretTokens {
  WeretTokens._();

  static const bg = Color(0xFFF3F3F4);
  static const ambient = Color(0xFFECECEC);
  static const surface = Color(0xFFFFFFFF);
  static const inputFill = Color(0xFFE9E9EB);
  static const brand = Color(0xFF2D2E32);
  static const brandHover = Color(0xFF1A1B1F);
  static const brandSoft = Color(0xFF52525B);
  static const textPrimary = Color(0xFF111111);
  static const textSecondary = Color(0xFF6B7280);
  static const textMuted = Color(0xFF9CA3AF);
  static const success = Color(0xFF22C55E);
  static const error = Color(0xFFDC2626);
  static const border = Color(0xFFD1D5DB);
  static const borderSubtle = Color(0xFFE5E7EB);
  static const successSoft = Color(0xFFDCFCE7);
  static const onSuccess = Color(0xFF166534);
  static const dangerSoft = Color(0xFFFEE2E2);
  static const brandSurface = Color(0x142D2E32);

  static const passengerAccent = brand;
  static const driverAccent = brand;

  static const pillRadius = 999.0;
  static const fieldRadius = 14.0;
  static const cardRadius = 20.0;
  static const hPad = 24.0;

  static const wordmarkStyle = TextStyle(
    fontSize: 34,
    fontWeight: FontWeight.w800,
    letterSpacing: 1.0,
    color: textPrimary,
  );
}
