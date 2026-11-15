import 'package:flutter/material.dart';

/// Color del puntito de cada prueba. Se usa igual en la selección de pruebas
/// y al crear un grupo, para que sean consistentes.
Color testDotColor(String id, String label, Color fallback) {
  final key = '$id $label'.toLowerCase();
  if (key.contains('m1')) return const Color(0xFF10B981); // verde
  if (key.contains('m2')) return const Color(0xFF6366F1); // violeta
  if (key.contains('cien')) return const Color(0xFFF5AF41); // naranja
  if (key.contains('hist')) return const Color(0xFFEF4444); // rojo
  if (key.contains('lect') || key.contains('verbal')) {
    return const Color(0xFF3B82F6); // azul
  }
  return fallback;
}