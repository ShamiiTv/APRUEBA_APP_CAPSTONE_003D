import 'package:dio/dio.dart';

import '../../core/network/api_client.dart';
import '../../data/practice_models.dart';
import '../../data/user_profile.dart';

class PracticeException implements Exception {
  final String message;
  final String? code;
  final String? nextStep;

  PracticeException(this.message, {this.code, this.nextStep});

  /// Cuota agotada: QUOTA_BASE_REACHED (se puede desbloquear +5) o QUOTA_DAILY_LIMIT (plan de pago).
  bool get isQuotaExceeded =>
      code == 'QUOTA_BASE_REACHED' ||
      code == 'QUOTA_DAILY_LIMIT' ||
      code == 'QUOTA_EXCEEDED';

  @override
  String toString() => message;
}

class PracticeRepository {
  final Map<String, Map<String, dynamic>> _feedback = {};
  String? _feedbackUid;
  PracticeException _error(DioException e, String fallback) {
    final body = e.response?.data;
    if (body is Map && body['error'] is Map) {
      final err = body['error'] as Map;
      final code = err['code']?.toString();
      String? next;
      final details = err['details'];
      if (details is List) {
        for (final d in details) {
          if (d is Map && d['nextStep'] != null) {
            next = d['nextStep'].toString();
          }
        }
      }
      if (code == 'QUOTA_DAILY_LIMIT') next = 'upgrade';
      return PracticeException(
        err['message'] is String ? err['message'] as String : fallback,
        code: code,
        nextStep: next,
      );
    }
    return PracticeException('No se pudo conectar con el servidor.');
  }

  // ── Pruebas y preferencias ──
  Future<List<PracticeTest>> fetchTests() async {
    try {
      final res = await ApiClient.dio.get('/tests');
      final list = (res.data['data'] as List?) ?? const [];
      return list
          .map(
            (t) => PracticeTest.fromJson(Map<String, dynamic>.from(t as Map)),
          )
          .toList();
    } on DioException catch (e) {
      throw _error(e, 'No se pudieron cargar las pruebas.');
    }
  }

  Future<PracticePrefs> fetchPrefs() async {
    try {
      final res = await ApiClient.dio.get('/auth/me');
      return PracticePrefs.fromJson(
        Map<String, dynamic>.from(res.data['data']),
      );
    } on DioException catch (e) {
      throw _error(e, 'No se pudo cargar tu configuración.');
    }
  }

  Future<void> savePrefs(PracticePrefs prefs) async {
    try {
      await ApiClient.dio.post(
        '/auth/onboarding',
        data: {
          'selectedTests': prefs.selectedTests,
          'practiceFormat': 'random',
          'difficulty': prefs.difficulty,
        },
      );
    } on DioException catch (e) {
      throw _error(e, 'No se pudo guardar tu configuración.');
    }
  }

  Future<Map<String, ProgressItem>> fetchProgress() async {
    try {
      final res = await ApiClient.dio.get('/progress');
      final list = (res.data['data']['subjects'] as List?) ?? const [];
      return {
        for (final e in list)
          (e as Map)['testId'].toString(): ProgressItem.fromJson(
            Map<String, dynamic>.from(e),
          ),
      };
    } on DioException catch (e) {
      throw _error(e, 'No se pudo cargar tu progreso.');
    }
  }

  // ── Práctica ──
  Future<NextQuestion> next() async {
    try {
      final prefs = await fetchPrefs();
      var hasAvailable = false;
      for (final testId in prefs.selectedTests) {
        final res = await ApiClient.dio.get(
          '/practice/next',
          queryParameters: {'testId': testId, 'difficulty': prefs.difficulty},
        );
        final next = NextQuestion.fromResponse(
          Map<String, dynamic>.from(res.data['data']),
          res.data['meta'] as Map?,
        );
        if (next.question != null) return next;
        hasAvailable =
            hasAvailable || (res.data['meta']['totalAvailable'] as num) > 0;
      }
      if (!hasAvailable) {
        throw PracticeException(
          'No hay preguntas disponibles para esta dificultad. El banco revisado usa Intermedio mientras se valida la clasificación.',
        );
      }
      return const NextQuestion.none();
    } on DioException catch (e) {
      final err = _error(e, 'No se pudo cargar la pregunta.');
      if (err.code == 'NO_QUESTIONS_AVAILABLE') {
        return const NextQuestion.none();
      }
      throw err;
    }
  }

  Future<AnswerResult> answer({
    required String questionId,
    required String selectedOption,
    required int elapsedMs,
  }) async {
    try {
      final res = await ApiClient.dio.post(
        '/practice/answers',
        data: {
          'questionId': questionId,
          'selectedOption': selectedOption,
          'elapsedMs': elapsedMs,
        },
      );
      final body = Map<String, dynamic>.from(res.data['data']);
      final profile = await ApiClient.dio.get('/auth/me');
      final uid = profile.data['data']['uid'].toString();
      if (_feedbackUid != uid) _feedback.clear();
      _feedbackUid = uid;
      _feedback[questionId] = body;
      return AnswerResult.fromJson(body);
    } on DioException catch (e) {
      throw _error(e, 'No se pudo enviar la respuesta.');
    }
  }

  Future<ExplanationData> fetchExplanation(String questionId) async {
    try {
      final profile = await ApiClient.dio.get('/auth/me');
      if (profile.data['data']['uid'] != _feedbackUid) _feedback.clear();
      final feedback = _feedback[questionId];
      if (feedback == null) {
        throw PracticeException(
          'Responde primero esta pregunta para consultar su explicación.',
        );
      }
      return ExplanationData.fromJson({
        'title': 'Explicación',
        'steps': [
          {'label': 'Solución', 'body': feedback['explanation']},
        ],
        'keyConcept': feedback['keyConcept'],
      });
    } on DioException catch (e) {
      throw _error(e, 'No se pudo cargar la explicación.');
    }
  }

  Future<SkillInfo> fetchSkill(String questionId) async {
    try {
      final res = await ApiClient.dio.get('/questions/$questionId/skill');
      return SkillInfo.fromJson(Map<String, dynamic>.from(res.data['data']));
    } on DioException catch (e) {
      throw _error(e, 'No se pudo cargar la habilidad.');
    }
  }

  // ── Desbloqueo de cuota ──
  Future<void> unlockSchool(String school, int age) async {
    try {
      await ApiClient.dio.post(
        '/me/quota/unlock',
        data: {'type': 'school', 'school': school, 'age': age},
      );
    } on DioException catch (e) {
      throw _error(e, 'No se pudo desbloquear.');
    }
  }

  Future<void> unlockAddress(Address address) async {
    try {
      await ApiClient.dio.post(
        '/me/quota/unlock',
        data: {
          'type': 'address',
          'region': address.commune,
          'address': address.toJson(),
        },
      );
    } on DioException catch (e) {
      throw _error(e, 'No se pudo desbloquear.');
    }
  }

  // ── Recorrecciones ──
  Future<CorrectionItem> createCorrection({
    required String questionId,
    required String reason,
    String comment = '',
  }) async {
    try {
      final res = await ApiClient.dio.post(
        '/corrections',
        data: {
          'questionId': questionId,
          'reason': reason,
          if (comment.trim().isNotEmpty) 'comment': comment.trim(),
        },
      );
      final d = Map<String, dynamic>.from(res.data['data']);
      return CorrectionItem(
        id: d['id'].toString(),
        questionId: questionId,
        reason: reason,
        comment: comment.trim(),
        status: (d['status'] ?? 'pending').toString(),
        rewardAmount: 0,
      );
    } on DioException catch (e) {
      throw _error(e, 'No se pudo enviar la solicitud.');
    }
  }

  Future<List<CorrectionItem>> listCorrections() async {
    try {
      final res = await ApiClient.dio.get('/corrections');
      return [
        for (final c in (res.data['data'] as List?) ?? const [])
          CorrectionItem.fromJson(Map<String, dynamic>.from(c as Map)),
      ];
    } on DioException catch (e) {
      throw _error(e, 'No se pudieron cargar tus solicitudes.');
    }
  }

  /// SOLO DEMOSTRACIÓN: el equipo de revisión confirma la recorrección (la API lo
  /// permite únicamente fuera de producción).
  Future<void> demoConfirmCorrection(String correctionId) async {
    try {
      await ApiClient.dio.post('/corrections/$correctionId/demo-confirm');
    } on DioException catch (e) {
      throw _error(e, 'No se pudo simular la revisión.');
    }
  }
}
