import 'package:flutter/material.dart';

import 'weret_tokens.dart';

class WeretTheme {
  WeretTheme._();

  static ThemeData get light => _base(Brightness.light);
  static ThemeData get dark => _base(Brightness.dark);

  static ThemeData _base(Brightness brightness) {
    final isLight = brightness == Brightness.light;
    final scheme = ColorScheme.fromSeed(
      seedColor: WeretTokens.brand,
      brightness: brightness,
      primary: WeretTokens.brand,
      surface: isLight ? WeretTokens.surface : const Color(0xFF1A1A1A),
    );

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: scheme,
      scaffoldBackgroundColor: isLight ? WeretTokens.bg : const Color(0xFF121212),
      fontFamily: 'Roboto',
      appBarTheme: AppBarTheme(
        centerTitle: true,
        elevation: 0,
        scrolledUnderElevation: 0,
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        foregroundColor: isLight ? WeretTokens.textPrimary : Colors.white,
      ),
      cardTheme: CardThemeData(
        color: isLight ? WeretTokens.surface : const Color(0xFF1E1E1E),
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(WeretTokens.cardRadius),
          side: const BorderSide(color: WeretTokens.border),
        ),
        margin: const EdgeInsets.only(bottom: 8),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: isLight ? WeretTokens.inputFill : const Color(0xFF2A2A2A),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(WeretTokens.fieldRadius),
          borderSide: const BorderSide(color: WeretTokens.border, width: 1.5),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(WeretTokens.fieldRadius),
          borderSide: const BorderSide(color: WeretTokens.border, width: 1.5),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(WeretTokens.fieldRadius),
          borderSide: const BorderSide(color: WeretTokens.brand, width: 1.5),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        labelStyle: const TextStyle(color: WeretTokens.textSecondary, fontWeight: FontWeight.w800, fontSize: 12),
        hintStyle: TextStyle(color: WeretTokens.textSecondary.withValues(alpha: 0.85), fontWeight: FontWeight.w600),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: WeretTokens.brand,
          foregroundColor: Colors.white,
          minimumSize: const Size.fromHeight(52),
          elevation: 4,
          shadowColor: Colors.black.withValues(alpha: 0.2),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(WeretTokens.pillRadius)),
          textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: WeretTokens.brand,
          backgroundColor: isLight ? WeretTokens.surface : Colors.transparent,
          minimumSize: const Size.fromHeight(52),
          side: const BorderSide(color: WeretTokens.brand, width: 2),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(WeretTokens.pillRadius)),
          textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: WeretTokens.textSecondary,
          textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: isLight ? WeretTokens.surface : const Color(0xFF1A1A1A),
        indicatorColor: WeretTokens.inputFill,
        labelTextStyle: WidgetStateProperty.all(const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
      ),
      dividerTheme: DividerThemeData(color: WeretTokens.borderSubtle.withValues(alpha: 0.9)),
    );
  }
}
