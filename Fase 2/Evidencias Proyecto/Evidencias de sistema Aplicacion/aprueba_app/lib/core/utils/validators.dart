import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../l10n/l10n.dart';

final _nameRe = RegExp(r"^\p{L}[\p{L}\s'.-]*$", unicode: true);
final _schoolRe = RegExp(r"^[\p{L}\p{N}][\p{L}\p{N}\s'.°#,-]*$", unicode: true);
final _streetRe = RegExp(
  r"^[\p{L}\p{N}][\p{L}\p{N}\s'.°#,\/-]*$",
  unicode: true,
);
final _unitRe = RegExp(r"^[\p{L}\p{N}][\p{L}\p{N}\s°#-]{0,9}$", unicode: true);
final _emailRe = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]{2,}$');
final _phoneRe = RegExp(r'^\+?[0-9]{8,15}$');

String _clean(String? v) => (v ?? '').trim().replaceAll(RegExp(r'\s+'), ' ');

// ── Filtros: impiden escribir caracteres no permitidos ──
final lettersFormatter = FilteringTextInputFormatter.allow(
  RegExp(r"[\p{L}\s'.-]", unicode: true),
);
final schoolFormatter = FilteringTextInputFormatter.allow(
  RegExp(r"[\p{L}\p{N}\s'.°#,-]", unicode: true),
);
final streetFormatter = FilteringTextInputFormatter.allow(
  RegExp(r"[\p{L}\p{N}\s'.°#,\/-]", unicode: true),
);
final unitFormatter = FilteringTextInputFormatter.allow(
  RegExp(r"[\p{L}\p{N}\s°#-]", unicode: true),
);
final phoneFormatter = FilteringTextInputFormatter.allow(
  RegExp(r'[0-9+\s()-]'),
);
final digitsFormatter = FilteringTextInputFormatter.digitsOnly;

// ── Validadores ──
String? vLetters(
  BuildContext c,
  String? v, {
  required String es,
  required String en,
  bool required = true,
}) {
  final s = _clean(v);
  if (s.isEmpty) return required ? tr(c, 'Ingresa $es', 'Enter $en') : null;
  if (s.length < 2) return tr(c, 'Muy corto', 'Too short');
  if (s.length > 60) return tr(c, 'Máximo 60 caracteres', 'Max 60 characters');
  if (!_nameRe.hasMatch(s)) {
    return tr(c, 'Usa solo letras y espacios', 'Use letters and spaces only');
  }
  return null;
}

String? vName(BuildContext c, String? v) =>
    vLetters(c, v, es: 'tu nombre', en: 'your name');

String? vEmail(BuildContext c, String? v) {
  final s = (v ?? '').trim();
  if (s.isEmpty) return tr(c, 'Ingresa tu correo', 'Enter your email');
  if (!_emailRe.hasMatch(s)) return tr(c, 'Correo inválido', 'Invalid email');
  return null;
}

String? vPassword(BuildContext c, String? v) {
  final s = v ?? '';
  if (s.isEmpty) return tr(c, 'Ingresa una contraseña', 'Enter a password');
  if (s.length < 8) {
    return tr(c, 'Mínimo 8 caracteres', 'At least 8 characters');
  }
  if (!RegExp(r'\p{L}', unicode: true).hasMatch(s) ||
      !RegExp(r'\d').hasMatch(s)) {
    return tr(
      c,
      'Debe incluir una letra y un número',
      'Must include a letter and a number',
    );
  }
  return null;
}

String? vConfirm(BuildContext c, String? v, String original) {
  if ((v ?? '').isEmpty) {
    return tr(c, 'Repite la contraseña', 'Repeat the password');
  }
  if (v != original) {
    return tr(c, 'Las contraseñas no coinciden', 'Passwords do not match');
  }
  return null;
}

String? vSchool(BuildContext c, String? v, {bool required = true}) {
  final s = _clean(v);
  if (s.isEmpty) {
    return required ? tr(c, 'Ingresa tu colegio', 'Enter your school') : null;
  }
  if (s.length < 3) return tr(c, 'Muy corto', 'Too short');
  if (s.length > 80) return tr(c, 'Máximo 80 caracteres', 'Max 80 characters');
  if (!_schoolRe.hasMatch(s)) {
    return tr(c, 'Usa solo letras y números', 'Use letters and numbers only');
  }
  return null;
}

String? vAge(BuildContext c, String? v, {bool required = true}) {
  final s = (v ?? '').trim();
  if (s.isEmpty) {
    return required ? tr(c, 'Ingresa tu edad', 'Enter your age') : null;
  }
  final n = int.tryParse(s);
  if (n == null || n < 5 || n > 99) {
    return tr(c, 'Edad entre 5 y 99', 'Age between 5 and 99');
  }
  return null;
}

String? vPhone(BuildContext c, String? v) {
  final s = (v ?? '').replaceAll(RegExp(r'[\s()-]'), '');
  if (s.isEmpty) return null;
  if (!_phoneRe.hasMatch(s)) {
    return tr(
      c,
      'Celular inválido (8 a 15 dígitos, puede llevar +)',
      'Invalid phone (8–15 digits, may start with +)',
    );
  }
  return null;
}

String? vStreet(BuildContext c, String? v) {
  final s = _clean(v);
  if (s.isEmpty) return tr(c, 'Ingresa tu dirección', 'Enter your address');
  if (s.length < 3) return tr(c, 'Muy corto', 'Too short');
  if (s.length > 80) return tr(c, 'Máximo 80 caracteres', 'Max 80 characters');
  if (!_streetRe.hasMatch(s)) {
    return tr(c, 'Caracteres no permitidos', 'Characters not allowed');
  }
  return null;
}

String? vUnit(BuildContext c, String? v, {required bool required}) {
  final s = _clean(v);
  if (s.isEmpty) {
    return required ? tr(c, 'Ingresa el número', 'Enter the number') : null;
  }
  if (!_unitRe.hasMatch(s)) return tr(c, 'Número inválido', 'Invalid number');
  return null;
}
