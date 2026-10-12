import '../core/utils/format_utils.dart';

class SharedQuestion {
  final String id;
  final String statement;
  final String sharedByName;
  final bool correct;
  final String elapsed;
  final String? comment;
  final DateTime? sharedAt;

  const SharedQuestion({
    required this.id,
    required this.statement,
    required this.sharedByName,
    required this.correct,
    required this.elapsed,
    required this.comment,
    required this.sharedAt,
  });

  factory SharedQuestion.fromJson(Map<String, dynamic> j) {
    final c = j['comment']?.toString().trim();
    return SharedQuestion(
      id: (j['id'] ?? '').toString(),
      statement: (j['statement'] ?? '').toString(),
      sharedByName: (j['sharedBy'] ?? 'Estudiante').toString(),
      correct: j['result'] == 'correct',
      elapsed: (j['elapsed'] ?? '').toString(),
      comment: (c == null || c.isEmpty) ? null : c,
      sharedAt: parseApiDate(j['sharedAt']),
    );
  }
}
