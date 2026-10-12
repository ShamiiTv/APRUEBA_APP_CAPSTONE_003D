import 'package:flutter/material.dart';

/// Colores del wireframe (Aprueba_App.html), en claro y oscuro.
class WfColors {
  final Color bg;
  final Color soft;
  final Color line;
  final Color ink;
  final Color muted;
  final Color brand;
  final Color chip;
  final Color success;
  final Color danger;

  const WfColors._({
    required this.bg,
    required this.soft,
    required this.line,
    required this.ink,
    required this.muted,
    required this.brand,
    required this.chip,
    required this.success,
    required this.danger,
  });

  static const light = WfColors._(
    bg: Color(0xFFFFFFFF),
    soft: Color(0xFFF1F5F9),
    line: Color(0xFFCBD5E1),
    ink: Color(0xFF1E293B),
    muted: Color(0xFF64748B),
    brand: Color(0xFF1A365D),
    chip: Color(0xFFEEF4FF),
    success: Color(0xFF10B981),
    danger: Color(0xFFEF4444),
  );

  static const dark = WfColors._(
    bg: Color(0xFF131C2E),
    soft: Color(0xFF1A2540),
    line: Color(0xFF1E2D45),
    ink: Color(0xFFE2E8F0),
    muted: Color(0xFF94A3B8),
    brand: Color(0xFF4A7BC8),
    chip: Color(0xFF1A2C4A),
    success: Color(0xFF34D399),
    danger: Color(0xFFF87171),
  );

  static WfColors of(BuildContext context) =>
      Theme.of(context).brightness == Brightness.dark ? dark : light;
}
