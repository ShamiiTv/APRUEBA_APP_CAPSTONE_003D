import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';

const Map<String, String> kDifficultyLabels = {
  'd1': 'Básico',
  'd2': 'Intermedio',
  'd3': 'Avanzado',
};

Color _parseColor(String? hex) {
  if (hex == null) return AppColors.azul;
  final h = hex.replaceFirst('#', '');
  if (h.length != 6) return AppColors.azul;
  final v = int.tryParse('FF$h', radix: 16);
  return v == null ? AppColors.azul : Color(v);
}

const _letters = ['A', 'B', 'C', 'D', 'E'];

class PracticeTest {
  final String id;
  final String label;
  final Color color;
  final bool hasQuestions;

  const PracticeTest({
    required this.id,
    required this.label,
    required this.color,
    required this.hasQuestions,
  });

  factory PracticeTest.fromJson(Map<String, dynamic> j) => PracticeTest(
    id: j['id'].toString(),
    label: (j['label'] ?? j['id']).toString(),
    color: _parseColor(j['color']?.toString()),
    hasQuestions: j['hasQuestions'] == true,
  );
}

/// Cuota diaria ({used, max}; max nulo = ilimitada). nextStep: school | address | upgrade.
class QuotaInfo {
  final int used;
  final int? max;
  final bool unlimited;
  final String? nextStep;

  const QuotaInfo({
    required this.used,
    required this.max,
    required this.unlimited,
    required this.nextStep,
  });

  factory QuotaInfo.fromJson(Map<String, dynamic> j) {
    final max = (j['max'] as num?)?.toInt();
    return QuotaInfo(
      used: (j['used'] as num?)?.toInt() ?? 0,
      max: max,
      unlimited: j['unlimited'] == true || max == null,
      nextStep: j['nextStep']?.toString(),
    );
  }
}

class PracticeOption {
  final String id;
  final String text;

  const PracticeOption({required this.id, required this.text});
}

class PracticeQuestion {
  final String id;
  final String testId;
  final String axis;
  final String? difficulty;
  final String statement;
  final List<PracticeOption> options;

  const PracticeQuestion({
    required this.id,
    required this.testId,
    required this.axis,
    required this.difficulty,
    required this.statement,
    required this.options,
  });

  /// Las alternativas llegan como lista de textos; la letra (A–E) es su posición.
  factory PracticeQuestion.fromJson(Map<String, dynamic> j) {
    final raw = (j['options'] as List?) ?? const [];
    return PracticeQuestion(
      id: j['id'].toString(),
      testId: (j['testId'] ?? '').toString(),
      axis: (j['axis'] ?? '').toString(),
      difficulty: j['difficulty']?.toString(),
      statement: (j['statement'] ?? '').toString(),
      options: [
        for (var i = 0; i < raw.length; i++)
          PracticeOption(
            id: raw[i] is Map
                ? raw[i]['id'].toString()
                : (i < _letters.length ? _letters[i] : '${i + 1}'),
            text: raw[i] is Map
                ? ((raw[i] as Map)['text'] ?? '').toString()
                : raw[i].toString(),
          ),
      ],
    );
  }
}

class NextQuestion {
  final PracticeQuestion? question;
  final bool allCompleted;
  final QuotaInfo? quota;

  const NextQuestion({
    required this.question,
    required this.allCompleted,
    required this.quota,
  });

  /// [data] es el cuerpo `data` de GET /practice/next y [meta] su `meta`.
  factory NextQuestion.fromResponse(Map<String, dynamic> data, Map? meta) {
    final qt = (data['user'] is Map) ? data['user']['quota'] : meta?['quota'];
    return NextQuestion(
      question: data['question'] is Map
          ? PracticeQuestion.fromJson(
              Map<String, dynamic>.from(data['question']),
            )
          : null,
      allCompleted: data['allCompleted'] == true,
      quota: qt is Map
          ? QuotaInfo.fromJson(Map<String, dynamic>.from(qt))
          : null,
    );
  }

  const NextQuestion.none()
    : question = null,
      allCompleted = true,
      quota = null;
}

class AnswerResult {
  final bool isCorrect;
  final List<String> correctAnswers;
  final String explanation; // explicación breve
  final String keyConcept;
  final int bronzeEarned;
  final int? cohortPercentile;
  final QuotaInfo? quota;

  const AnswerResult({
    required this.isCorrect,
    required this.correctAnswers,
    required this.explanation,
    required this.keyConcept,
    required this.bronzeEarned,
    required this.cohortPercentile,
    required this.quota,
  });

  factory AnswerResult.fromJson(Map<String, dynamic> j) {
    final list = j['correctAnswers'];
    final main = j['correctAnswer']?.toString();
    final correct = (list is List && list.isNotEmpty)
        ? list.map((e) => e.toString()).toList()
        : (main != null ? <String>[main] : <String>[]);
    final qt = j['quota'] ?? (j['user'] is Map ? j['user']['quota'] : null);
    final medal = j['medalAwarded'];
    return AnswerResult(
      isCorrect: j['isCorrect'] == true || j['correct'] == true,
      correctAnswers: correct,
      explanation: (j['explanation'] ?? j['shortExplanation'] ?? '').toString(),
      keyConcept: (j['keyConcept'] ?? '').toString(),
      bronzeEarned:
          (j['bronzeEarned'] as num?)?.toInt() ??
          (medal is Map ? ((medal['amount'] as num?)?.toInt() ?? 0) : 0),
      cohortPercentile: (j['cohortPercentile'] as num?)?.toInt(),
      quota: qt is Map
          ? QuotaInfo.fromJson(Map<String, dynamic>.from(qt))
          : null,
    );
  }
}

class ProgressItem {
  final int answered;
  final int correct;
  final int percent;

  const ProgressItem({
    required this.answered,
    required this.correct,
    required this.percent,
  });

  factory ProgressItem.fromJson(Map<String, dynamic> j) => ProgressItem(
    answered: (j['answered'] as num?)?.toInt() ?? 0,
    correct: (j['correct'] as num?)?.toInt() ?? 0,
    percent:
        (j['coverage'] as num?)?.round() ??
        (j['percent'] as num?)?.toInt() ??
        0,
  );
}

/// Configuración de práctica: pruebas elegidas, formato (random | facsim) y dificultad (d1–d4).
class PracticePrefs {
  final List<String> selectedTests;
  final String format;
  final String difficulty;

  const PracticePrefs({
    required this.selectedTests,
    required this.format,
    required this.difficulty,
  });

  factory PracticePrefs.fromJson(Map<String, dynamic> j) => PracticePrefs(
    selectedTests: ((j['selectedTests'] as List?) ?? const [])
        .map((e) => e.toString())
        .toList(),
    format: (j['practiceFormat'] ?? j['format'] ?? 'random').toString(),
    difficulty: (j['difficulty'] ?? 'd2').toString(),
  );
}

/// Datos de la pregunta que viajan del resultado a explicación, habilidad y recorrección.
class ExplanationArgs {
  final String questionId;
  final String testLabel;
  final String statement;
  final String? difficulty;
  final String axis;
  final String correctAnswer;

  const ExplanationArgs({
    required this.questionId,
    required this.testLabel,
    required this.statement,
    this.difficulty,
    this.axis = '',
    this.correctAnswer = '',
  });
}

class ExplanationStep {
  final String label;
  final String body;
  const ExplanationStep({required this.label, required this.body});
}

class ExplanationData {
  final String title;
  final String subject;
  final List<ExplanationStep> steps;
  final String verification;
  final String keyConcept;

  const ExplanationData({
    required this.title,
    required this.subject,
    required this.steps,
    required this.verification,
    required this.keyConcept,
  });

  factory ExplanationData.fromJson(Map<String, dynamic> j) => ExplanationData(
    title: (j['title'] ?? '').toString(),
    subject: (j['subject'] ?? '').toString(),
    steps: [
      for (final s in (j['steps'] as List?) ?? const [])
        ExplanationStep(
          label: ((s as Map)['label'] ?? '').toString(),
          body: (s['body'] ?? '').toString(),
        ),
    ],
    verification: (j['verification'] ?? '').toString(),
    keyConcept: (j['keyConcept'] ?? '').toString(),
  );
}

class SkillPrerequisite {
  final String name;
  final String status; // done | active | locked
  const SkillPrerequisite({required this.name, required this.status});
}

class SkillResource {
  final String type; // video | pdf | module
  final String title;
  final String? duration;
  final String? source;
  final String? url;
  const SkillResource({
    required this.type,
    required this.title,
    this.duration,
    this.source,
    this.url,
  });
}

class SkillInfo {
  final String name;
  final String test;
  final int level;
  final int maxLevel;
  final int percent;
  final int correct;
  final int total;
  final String status; // not_started | in_progress | mastered
  final List<SkillPrerequisite> prerequisites;
  final List<SkillResource> resources;

  const SkillInfo({
    required this.name,
    required this.test,
    required this.level,
    required this.maxLevel,
    required this.percent,
    required this.correct,
    required this.total,
    required this.status,
    required this.prerequisites,
    required this.resources,
  });

  factory SkillInfo.fromJson(Map<String, dynamic> j) {
    final skill = Map<String, dynamic>.from((j['skill'] as Map?) ?? {});
    final mastery = Map<String, dynamic>.from((j['mastery'] as Map?) ?? {});
    String? opt(dynamic v) {
      final s = v?.toString();
      return (s == null || s.isEmpty) ? null : s;
    }

    return SkillInfo(
      name: (skill['name'] ?? '').toString(),
      test: (skill['test'] ?? '').toString(),
      level: (skill['level'] as num?)?.toInt() ?? 1,
      maxLevel: (skill['maxLevel'] as num?)?.toInt() ?? 4,
      percent: (mastery['percent'] as num?)?.toInt() ?? 0,
      correct: (mastery['correct'] as num?)?.toInt() ?? 0,
      total: (mastery['total'] as num?)?.toInt() ?? 0,
      status: (mastery['status'] ?? 'not_started').toString(),
      prerequisites: [
        for (final p in (j['prerequisites'] as List?) ?? const [])
          SkillPrerequisite(
            name: ((p as Map)['name'] ?? '').toString(),
            status: (p['status'] ?? 'locked').toString(),
          ),
      ],
      resources: [
        for (final r in (j['resources'] as List?) ?? const [])
          SkillResource(
            type: ((r as Map)['type'] ?? '').toString(),
            title: (r['title'] ?? '').toString(),
            duration: opt(r['duration']),
            source: opt(r['source']),
            url: opt(r['url']),
          ),
      ],
    );
  }
}

class CorrectionItem {
  final String id;
  final String questionId;
  final String reason;
  final String comment;
  final String status; // pending | confirmed | rejected
  final int rewardAmount;

  const CorrectionItem({
    required this.id,
    required this.questionId,
    required this.reason,
    required this.comment,
    required this.status,
    required this.rewardAmount,
  });

  factory CorrectionItem.fromJson(Map<String, dynamic> j) {
    final reward = j['rewardGranted'];
    return CorrectionItem(
      id: j['id'].toString(),
      questionId: (j['questionId'] ?? '').toString(),
      reason: (j['reason'] ?? '').toString(),
      comment: (j['comment'] ?? '').toString(),
      status: (j['status'] ?? 'pending').toString(),
      rewardAmount: reward is Map
          ? ((reward['amount'] as num?)?.toInt() ?? 0)
          : 0,
    );
  }
}
