import 'package:flutter/material.dart';

abstract class AppColors {
  // Base
  static const Color primary = Color(0xFF000000);
  static const Color secondary = Color(0xFFFFFFFF);
  static const Color accent = Color(0xFFF59E0B);
  static const Color primaryBlue = Color(0xFF1978E5);

  // Text
  static const Color textPrimary = Color(0xFF000000);
  static const Color textDarkGray = Color(0xFF414753);
  static const Color textSecondary = Color(0xFF414753);
  static const Color textMuted = Color(0xFF717785);

  // Backgrounds & Borders
  static const Color inputBackground = Color(0xFFF2F3FD);
  static const Color surfaceLight = Color(0xFFF9F9FF);
  static const Color borderLight = Color(0xFFDADCEF);
  static const Color borderMedium = Color(0xFFDADCEF);

  // Status
  static const Color success = Color(0xFF22C55E);
  static const Color error = Color(0xFFBA1A1A);

  // Premium / Surge
  static const Color premiumOrange = Color(0xFF964400);
  static const Color premiumOrangeLight = Color(0xFFBD5700);
}
