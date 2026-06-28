import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'weret_tokens.dart';

abstract class AppStyles {
  static const double logoSizeSplash = 48.0;
  static const double logoSizeSmall = 24.0;

  static TextStyle get bodyRegular => GoogleFonts.poppins(
        fontSize: 14,
        fontWeight: FontWeight.w400,
        color: WeretTokens.textSecondary,
      );

  static TextStyle get bodySemiBold => GoogleFonts.poppins(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: WeretTokens.textPrimary,
      );

  static TextStyle get headlineSmall => GoogleFonts.poppins(
        fontSize: 18,
        fontWeight: FontWeight.w700,
        color: WeretTokens.textPrimary,
      );

  static TextStyle get headlineMedium => GoogleFonts.poppins(
        fontSize: 22,
        fontWeight: FontWeight.w700,
        color: WeretTokens.textPrimary,
      );

  static TextStyle get headlineLarge => GoogleFonts.poppins(
        fontSize: 28,
        fontWeight: FontWeight.w700,
        color: WeretTokens.textPrimary,
      );

  static TextStyle get sectionLabel => GoogleFonts.poppins(
        fontSize: 10,
        fontWeight: FontWeight.w500,
        letterSpacing: 1.2,
        color: WeretTokens.textMuted,
      );

  static TextStyle get priceLarge => GoogleFonts.poppins(
        fontSize: 28,
        fontWeight: FontWeight.w700,
        color: WeretTokens.textPrimary,
      );

  // ── Additional variants ──

  static TextStyle get title => GoogleFonts.poppins(
        fontSize: 17,
        fontWeight: FontWeight.w700,
        color: WeretTokens.textPrimary,
      );

  static TextStyle get caption => GoogleFonts.poppins(
        fontSize: 12,
        fontWeight: FontWeight.w500,
        color: WeretTokens.textMuted,
      );

  static TextStyle get bodySmall => GoogleFonts.poppins(
        fontSize: 12,
        fontWeight: FontWeight.w400,
        color: WeretTokens.textSecondary,
      );

  static TextStyle get label => GoogleFonts.poppins(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: WeretTokens.textSecondary,
      );

  static TextStyle get labelSmall => GoogleFonts.poppins(
        fontSize: 12,
        fontWeight: FontWeight.w600,
        color: WeretTokens.textMuted,
      );

  static TextStyle get priceSmall => GoogleFonts.poppins(
        fontSize: 16,
        fontWeight: FontWeight.w800,
        color: WeretTokens.textPrimary,
      );

  static TextStyle get priceMedium => GoogleFonts.poppins(
        fontSize: 20,
        fontWeight: FontWeight.w700,
        color: WeretTokens.textPrimary,
      );
}
