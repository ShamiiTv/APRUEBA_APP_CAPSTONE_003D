import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'app_colors.dart';
import 'wf_colors.dart';

class AppTheme {
  AppTheme._();

  static ThemeData light() => _build(Brightness.light);
  static ThemeData dark() => _build(Brightness.dark);

  static ThemeData _build(Brightness b) {
    final c = b == Brightness.dark ? WfColors.dark : WfColors.light;
    // Manual de marca: "Fondo General" #F8FAFC en modo claro.
    final pageBg = b == Brightness.dark ? c.bg : const Color(0xFFF8FAFC);

    final scheme =
        ColorScheme.fromSeed(seedColor: AppColors.azul, brightness: b).copyWith(
          primary: c.brand,
          onPrimary: Colors.white,
          secondary: AppColors.oro,
          onSecondary: AppColors.azul,
          error: c.danger,
          surface: c.bg,
          onSurface: c.ink,
          outlineVariant: c.line,
        );

    // Texto base de Flutter con los colores del wireframe.
    final plain = ThemeData(brightness: b).textTheme
        .apply(bodyColor: c.ink, displayColor: c.ink);

    // Inter para todo el texto (se aplica estilo por estilo).
    TextStyle? inter(TextStyle? s) => GoogleFonts.inter(textStyle: s);

    // Montserrat para títulos, botones y módulos.
    TextStyle mont(double size, FontWeight w) =>
        GoogleFonts.montserrat(fontSize: size, fontWeight: w, color: c.ink);

    final textTheme = TextTheme(
      displayLarge: inter(plain.displayLarge),
      displayMedium: inter(plain.displayMedium),
      displaySmall: inter(plain.displaySmall),
      headlineLarge: mont(30, FontWeight.w800),
      headlineMedium: mont(22, FontWeight.w700),
      headlineSmall: mont(17, FontWeight.w700),
      titleLarge: mont(18, FontWeight.w700),
      titleMedium: inter(plain.titleMedium)
          ?.copyWith(fontWeight: FontWeight.w700),
      titleSmall: inter(plain.titleSmall),
      bodyLarge: inter(plain.bodyLarge),
      bodyMedium: inter(plain.bodyMedium),
      bodySmall: inter(plain.bodySmall),
      labelLarge: inter(plain.labelLarge),
      labelMedium: inter(plain.labelMedium),
      labelSmall: inter(plain.labelSmall),
    );

    final border = OutlineInputBorder(
      borderRadius: BorderRadius.circular(10),
      borderSide: BorderSide(color: c.line, width: 1.5),
    );

    return ThemeData(
      useMaterial3: true,
      brightness: b,
      colorScheme: scheme,
      scaffoldBackgroundColor: pageBg,
      textTheme: textTheme,
      dividerColor: c.line,
      appBarTheme: AppBarTheme(
        backgroundColor: pageBg,
        foregroundColor: c.brand,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        shape: Border(bottom: BorderSide(color: c.line)),
        titleTextStyle: GoogleFonts.montserrat(
          fontSize: 14,
          fontWeight: FontWeight.w800,
          color: c.brand,
        ),
      ),
      cardTheme: CardThemeData(
        color: c.soft,
        elevation: 0,
        margin: EdgeInsets.zero,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: BorderSide(color: c.line, width: 1.5),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.oro,
          foregroundColor: AppColors.azul,
          disabledBackgroundColor: AppColors.oro.withValues(alpha: 0.4),
          disabledForegroundColor: AppColors.azul.withValues(alpha: 0.4),
          minimumSize: const Size.fromHeight(48),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: GoogleFonts.montserrat(
            fontSize: 14,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          backgroundColor: c.soft,
          foregroundColor: c.ink,
          minimumSize: const Size.fromHeight(48),
          side: BorderSide(color: c.line, width: 1.5),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: GoogleFonts.montserrat(
            fontSize: 14,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: c.brand,
          textStyle: GoogleFonts.montserrat(
            fontSize: 13,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: c.soft,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 12,
          vertical: 14,
        ),
        border: border,
        enabledBorder: border,
        focusedBorder: border.copyWith(
          borderSide: BorderSide(color: c.brand, width: 1.5),
        ),
        hintStyle: GoogleFonts.inter(fontSize: 13, color: c.muted),
        labelStyle: GoogleFonts.inter(fontSize: 13, color: c.muted),
      ),
      switchTheme: SwitchThemeData(
        thumbColor: const WidgetStatePropertyAll(Colors.white),
        trackOutlineColor: const WidgetStatePropertyAll(Colors.transparent),
        trackColor: WidgetStateProperty.resolveWith(
          (s) => s.contains(WidgetState.selected) ? c.brand : c.line,
        ),
      ),
    );
  }
}
