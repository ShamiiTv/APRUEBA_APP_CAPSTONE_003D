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

String timeAgo(DateTime? d) {
  if (d == null) return '';
  final diff = DateTime.now().difference(d);
  if (diff.inMinutes < 1) return 'ahora';
  if (diff.inMinutes < 60) return 'hace ${diff.inMinutes} min';
  if (diff.inHours < 24) return 'hace ${diff.inHours} h';
  if (diff.inDays < 30) return 'hace ${diff.inDays} d';
  return 'hace ${diff.inDays ~/ 30} mes';
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
