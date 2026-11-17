import 'package:flutter/material.dart';

import '../l10n/l10n.dart';

/// Convierte fechas de la API (texto ISO o {_seconds, _nanoseconds}) a DateTime.
DateTime? parseApiDate(dynamic v) {
  if (v == null) return null;
  if (v is String) return DateTime.tryParse(v)?.toLocal();
  if (v is Map) {
    final s = v['_seconds'] ?? v['seconds'];
    if (s is num) {
      return DateTime.fromMillisecondsSinceEpoch(s.toInt() * 1000);
    }
  }
  return null;
}

String timeAgo(DateTime? d, {bool english = false}) {
  if (d == null) return '';
  final diff = DateTime.now().difference(d);
  if (diff.inMinutes < 1) return english ? 'now' : 'ahora';
  if (diff.inMinutes < 60) {
    return english ? '${diff.inMinutes} min ago' : 'hace ${diff.inMinutes} min';
  }
  if (diff.inHours < 24) {
    return english ? '${diff.inHours} h ago' : 'hace ${diff.inHours} h';
  }
  if (diff.inDays < 30) {
    return english ? '${diff.inDays} d ago' : 'hace ${diff.inDays} d';
  }
  return english
      ? '${diff.inDays ~/ 30} months ago'
      : 'hace ${diff.inDays ~/ 30} mes';
}

String initialsOf(String name) {
  final parts = name
      .trim()
      .split(RegExp(r'\s+'))
      .where((p) => p.isNotEmpty)
      .toList();
  if (parts.isEmpty) return '?';
  if (parts.length == 1) {
    final p = parts.first;
    return (p.length >= 2 ? p.substring(0, 2) : p).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

String activityDate(BuildContext context, dynamic value) {
  final date = parseApiDate(value)?.toLocal();
  if (date == null) return '';
  final locale = MaterialLocalizations.of(context);
  return '${locale.formatMediumDate(date)} · ${locale.formatTimeOfDay(TimeOfDay.fromDateTime(date), alwaysUse24HourFormat: !isEnglish(context))}';
}
