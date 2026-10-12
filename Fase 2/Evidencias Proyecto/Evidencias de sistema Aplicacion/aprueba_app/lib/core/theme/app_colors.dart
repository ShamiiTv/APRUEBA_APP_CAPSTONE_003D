import 'package:flutter/material.dart';

/// Colores de marca de Aprueba, extraídos del Manual de Marca
/// y del CSS real de aprueba_student_web (index.css).
class AppColors {
  AppColors._();

  // Colores de marca (iguales en modo claro y oscuro)
  static const Color azul = Color(0xFF1A365D);
  static const Color oro = Color(0xFFF5B041);

  // Modo claro
  static const Color fondoLight = Color(0xFFF8FAFC);
  static const Color textoLight = Color(0xFF1E293B);
  static const Color mutedLight = Color(0xFF64748B);
  static const Color lineLight = Color(0xFFE2E8F0);
  static const Color softLight = Color(0xFFF1F5F9);
  static const Color panelLight = Color(0xFFFFFFFF);

  // Modo oscuro
  static const Color fondoDark = Color(0xFF0B1220);
  static const Color panelDark = Color(0xFF131C2E);
  static const Color textoDark = Color(0xFFE2E8F0);
  static const Color mutedDark = Color(0xFF94A3B8);
  static const Color lineDark = Color(0xFF1E2D45);
  static const Color softDark = Color(0xFF1A2540);
  static const Color brandDark = Color(0xFF2D5A9E);

  // Semánticos (éxito / error), distintos en cada modo
  static const Color exitoLight = Color(0xFF10B981);
  static const Color errorLight = Color(0xFFEF4444);
  static const Color exitoDark = Color(0xFF34D399);
  static const Color errorDark = Color(0xFFF87171);

  // Medallas (iguales en ambos modos)
  static const Color bronze = Color(0xFFCD7F32);
  static const Color silver = Color(0xFF94A3B8);
  static const Color gold = Color(0xFFF5B041);
  static const Color diamond = Color(0xFF38BDF8);
  static const Color platinum = Color(0xFFA78BFA);
}
