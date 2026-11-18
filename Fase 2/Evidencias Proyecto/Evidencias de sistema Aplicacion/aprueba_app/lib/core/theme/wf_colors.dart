import 'package:flutter/material.dart';

/// Colores del wireframe (Aprueba_App.html), en claro y oscuro.
class WfColors extends ThemeExtension<WfColors> {
  final Color bg;
  final Color soft;
  final Color line;
  final Color ink;
  final Color muted;
  final Color brand;
  final Color onBrand;
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
    required this.onBrand,
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
    onBrand: Colors.white,
    chip: Color(0xFFEEF4FF),
    success: Color(0xFF10B981),
    danger: Color(0xFFEF4444),
  );

  static const dark = WfColors._(
    bg: Color(0xFF131C2E),
    soft: Color(0xFF1B2940),
    line: Color(0xFF30415C),
    ink: Color(0xFFE2E8F0),
    muted: Color(0xFF94A3B8),
    brand: Color(0xFF80B3FF),
    onBrand: Color(0xFF10213A),
    chip: Color(0xFF1A2C4A),
    success: Color(0xFF34D399),
    danger: Color(0xFFF87171),
  );

  @override
  WfColors copyWith({
    Color? bg,
    Color? soft,
    Color? line,
    Color? ink,
    Color? muted,
    Color? brand,
    Color? onBrand,
    Color? chip,
    Color? success,
    Color? danger,
  }) => WfColors._(
    bg: bg ?? this.bg,
    soft: soft ?? this.soft,
    line: line ?? this.line,
    ink: ink ?? this.ink,
    muted: muted ?? this.muted,
    brand: brand ?? this.brand,
    onBrand: onBrand ?? this.onBrand,
    chip: chip ?? this.chip,
    success: success ?? this.success,
    danger: danger ?? this.danger,
  );

  @override
  WfColors lerp(covariant WfColors? other, double t) {
    if (other == null) return this;
    return WfColors._(
      bg: Color.lerp(bg, other.bg, t)!,
      soft: Color.lerp(soft, other.soft, t)!,
      line: Color.lerp(line, other.line, t)!,
      ink: Color.lerp(ink, other.ink, t)!,
      muted: Color.lerp(muted, other.muted, t)!,
      brand: Color.lerp(brand, other.brand, t)!,
      onBrand: Color.lerp(onBrand, other.onBrand, t)!,
      chip: Color.lerp(chip, other.chip, t)!,
      success: Color.lerp(success, other.success, t)!,
      danger: Color.lerp(danger, other.danger, t)!,
    );
  }

  static WfColors of(BuildContext context) =>
      Theme.of(context).extension<WfColors>() ??
      (Theme.of(context).brightness == Brightness.dark ? dark : light);

  static Color readableForeground(Color preferred, Color background) {
    final a = preferred.computeLuminance(), b = background.computeLuminance();
    final ratio = a > b ? (a + .05) / (b + .05) : (b + .05) / (a + .05);
    if (ratio >= 4.5) return preferred;
    return b > .179 ? Colors.black : Colors.white;
  }
}
