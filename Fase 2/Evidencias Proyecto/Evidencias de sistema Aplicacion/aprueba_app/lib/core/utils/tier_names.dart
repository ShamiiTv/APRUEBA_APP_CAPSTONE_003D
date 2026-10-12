import 'package:flutter/widgets.dart';

import '../l10n/l10n.dart';

/// Nombre de la medalla según el idioma activo.
String tierName(BuildContext context, String tier) => switch (tier) {
  'bronze' => tr(context, 'Bronce', 'Bronze'),
  'silver' => tr(context, 'Plata', 'Silver'),
  'gold' => tr(context, 'Oro', 'Gold'),
  'diamond' => tr(context, 'Diamante', 'Diamond'),
  'platinum' => tr(context, 'Platino', 'Platinum'),
  _ => tier,
};

/// "1 día" / "3 días" (y "1 day" / "3 days" en inglés).
String daysLabel(BuildContext context, int n) =>
    tr(context, n == 1 ? '$n día' : '$n días', n == 1 ? '$n day' : '$n days');

const _testNamesEn = {
  'lectora': 'Reading Comprehension',
  'm1': 'Mathematics M1',
  'm2': 'Mathematics M2',
  'cien': 'Science (Biology)',
  'hist': 'History & Social Sci.',
  // Por si solo llega el nombre en español (p. ej. tutores).
  'Competencia Lectora': 'Reading Comprehension',
  'Matemática M1': 'Mathematics M1',
  'Matemática M2': 'Mathematics M2',
  'Ciencias (Biología)': 'Science (Biology)',
  'Historia y C. Soc.': 'History & Social Sci.',
};

/// Nombre de una prueba según el idioma. [key] es el id (o el nombre en español) y
/// [label] el nombre que entrega la API (se usa en español o si no hay traducción).
String testName(BuildContext context, String key, String label) {
  final en = _testNamesEn[key] ?? _testNamesEn[label];
  return en == null ? label : tr(context, label, en);
}

/// Títulos de pasos de resolución que genera el servidor ("Planteamiento", "Paso 2"…).
String stepLabel(BuildContext context, String label) {
  if (label == 'Planteamiento') return tr(context, label, 'Setup');
  if (label == 'Resolución') return tr(context, label, 'Solution');
  final m = RegExp(r'^Paso (\d+)$').firstMatch(label);
  if (m != null) return tr(context, label, 'Step ${m.group(1)}');
  return label;
}

/// Nivel de dificultad (d1–d4) según el idioma.
String? difficultyName(BuildContext context, String? key) => switch (key) {
  'd1' => tr(context, 'Básico', 'Basic'),
  'd2' => tr(context, 'Intermedio', 'Intermediate'),
  'd3' => tr(context, 'Avanzado', 'Advanced'),
  'd4' => tr(context, 'Élite PAES', 'PAES Elite'),
  _ => null,
};

const _axesEn = {
  'Vocabulario': 'Vocabulary',
  'Comprensión': 'Comprehension',
  'Evaluación': 'Evaluation',
  'Álgebra y Funciones': 'Algebra & Functions',
  'Números': 'Numbers',
  'Geometría': 'Geometry',
  'Probabilidad y Estadística': 'Probability & Statistics',
  'Álgebra Avanzada': 'Advanced Algebra',
  'Cálculo y Límites': 'Calculus & Limits',
  'Vectores y Complejos': 'Vectors & Complex Numbers',
  'Célula y Ciclo Celular': 'Cell & Cell Cycle',
  'Organización y Sistemas': 'Organization & Systems',
  'Ecosistemas': 'Ecosystems',
};

/// Eje temático según el idioma (si no hay traducción se deja tal cual).
String axisName(BuildContext context, String axis) {
  final en = _axesEn[axis];
  return en == null ? axis : tr(context, axis, en);
}
