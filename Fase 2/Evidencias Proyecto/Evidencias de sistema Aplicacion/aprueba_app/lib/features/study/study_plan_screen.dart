import '../../core/utils/tier_names.dart';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/l10n/l10n.dart';
import '../../core/network/api_client.dart';
import '../../core/widgets/content_skeleton.dart';
import '../../core/theme/wf_colors.dart';

class StudyPlanRepository {
  Future<Map<String, dynamic>> fetch() async => Map<String, dynamic>.from(
    (await ApiClient.dio.get('/study-plan')).data['data'],
  );
  Future<void> save(int goal, List<String> ids) async {
    await ApiClient.dio.put(
      '/study-plan',
      data: {'dailyGoal': goal, 'testIds': ids},
    );
  }
}

final studyPlanRepositoryProvider = Provider((ref) => StudyPlanRepository());

class StudyPlanScreen extends ConsumerStatefulWidget {
  const StudyPlanScreen({super.key});
  @override
  ConsumerState<StudyPlanScreen> createState() => _StudyPlanState();
}

class _StudyPlanState extends ConsumerState<StudyPlanScreen> {
  Map<String, dynamic>? plan;
  String? error;
  bool saving = false, loading = true;
  int goal = 10;
  Set<String> tests = {};
  static const subjects = {
    'm1': 'M1',
    'm2': 'M2',
    'lectora': 'Competencia Lectora',
    'cien': 'Ciencias',
    'hist': 'Historia',
  };
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => loading = true);
    try {
      final data = await ref.read(studyPlanRepositoryProvider).fetch();
      if (!mounted) return;
      setState(() {
        plan = data;
        goal = (data['settings']['dailyGoal'] as num).toInt();
        tests = Set<String>.from(data['settings']['testIds']);
        error = null;
      });
    } catch (e) {
      if (mounted) {
        setState(
          () => error = tr(
            context,
            'No se pudo cargar el plan. Reintenta.',
            'Could not load your plan. Retry.',
          ),
        );
      }
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  bool get dirty {
    final settings = plan?['settings'];
    return settings != null &&
        (goal != settings['dailyGoal'] ||
            tests.length != (settings['testIds'] as List).length ||
            !tests.containsAll(List<String>.from(settings['testIds'])));
  }

  Future<void> _save() async {
    if (saving || tests.isEmpty) return;
    setState(() => saving = true);
    try {
      await ref.read(studyPlanRepositoryProvider).save(goal, tests.toList());
      await _load();
    } catch (e) {
      if (mounted) {
        setState(
          () => error = tr(
            context,
            'No se pudo guardar. Tus cambios se conservan para reintentar.',
            'Could not save. Your changes are kept for retry.',
          ),
        );
      }
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  static const accents = {
    'm1': Color(0xFF7C5CCE),
    'm2': Color(0xFF3876C5),
    'lectora': Color(0xFFC06C2E),
    'cien': Color(0xFF16856B),
    'hist': Color(0xFFB65C7C),
  };

  Widget _panel(Widget child, {Color? accent}) {
    final c = WfColors.of(context);
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: c.bg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: accent ?? c.line),
      ),
      child: child,
    );
  }

  Widget _heading(String number, String title, String subtitle) {
    final c = WfColors.of(context);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 35,
          height: 35,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: c.soft,
            borderRadius: BorderRadius.circular(11),
          ),
          child: Text(
            number,
            style: TextStyle(
              color: c.muted,
              fontWeight: FontWeight.w800,
              fontSize: 11,
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: Theme.of(context).textTheme.titleMedium
                    ?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 6),
              Text(
                subtitle,
                style: TextStyle(fontSize: 12, height: 1.6, color: c.muted),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _today(Map<String, dynamic> p) {
    final target = (p['settings']['dailyGoal'] as num).toInt();
    final done = (p['completedToday'] as num).toInt();
    final progress = (done / target).clamp(0.0, 1.0).toDouble();
    final parsed = DateTime.tryParse(p['date'].toString());
    final date = parsed == null
        ? p['date'].toString()
        : MaterialLocalizations.of(context).formatMediumDate(parsed);
    final next = p['remainingGoal'] == 0
        ? tr(
            context,
            '¡Cumpliste tu meta de hoy!',
            'You reached your goal today!',
          )
        : p['quotaRemaining'] == 0
        ? tr(
            context,
            'Llegaste a tu cuota diaria. Mañana podrás continuar.',
            'You reached your daily quota. Continue tomorrow.',
          )
        : p['scheduled'] == 0
        ? tr(
            context,
            'No quedan preguntas nuevas en estas pruebas. Puedes ajustar tu selección.',
            'No new questions remain in these tests. You can change your selection.',
          )
        : tr(
            context,
            'Tu siguiente paso: ${p['scheduled']} ${p['scheduled'] == 1 ? 'pregunta' : 'preguntas'} para hoy.',
            'Your next step: ${p['scheduled']} ${p['scheduled'] == 1 ? 'question' : 'questions'} today.',
          );
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        gradient: const LinearGradient(
          colors: [Color(0xFF1A365D), Color(0xFF254B79)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 16,
            runSpacing: 8,
            children: [
              Text(
                tr(context, 'PASO A PASO', 'STEP BY STEP'),
                style: const TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.2,
                  color: Color(0xFFCFDEF4),
                ),
              ),
              Text(
                '$date · Chile',
                style: const TextStyle(fontSize: 11, color: Color(0xFFCFDEF4)),
              ),
            ],
          ),
          const SizedBox(height: 26),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      tr(context, 'Tu objetivo de hoy', 'Your goal today'),
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 14),
                    Text.rich(
                      TextSpan(
                        children: [
                          TextSpan(
                            text: '$done',
                            style: const TextStyle(
                              fontSize: 48,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          TextSpan(
                            text: ' / $target',
                            style: const TextStyle(
                              fontSize: 24,
                              color: Color(0xFFCFDEF4),
                            ),
                          ),
                        ],
                      ),
                      style: const TextStyle(color: Colors.white),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      tr(
                        context,
                        'preguntas respondidas en tu plan',
                        'questions answered in your plan',
                      ),
                      style: const TextStyle(
                        fontSize: 12,
                        height: 1.6,
                        color: Color(0xFFDCE7F7),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              ExcludeSemantics(
                child: SizedBox(
                  width: 78,
                  height: 78,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      SizedBox.expand(
                        child: CircularProgressIndicator(
                          value: progress,
                          strokeWidth: 7,
                          color: const Color(0xFFF7B43F),
                          backgroundColor: Colors.white12,
                        ),
                      ),
                      Text(
                        '${(progress * 100).round()}%',
                        style: const TextStyle(
                          fontSize: 19,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          LinearProgressIndicator(
            value: progress,
            minHeight: 7,
            borderRadius: BorderRadius.circular(8),
            color: const Color(0xFFF7B43F),
            backgroundColor: Colors.white12,
            semanticsLabel: tr(
              context,
              'Avance de la meta diaria',
              'Daily goal progress',
            ),
          ),
          const SizedBox(height: 20),
          Text(
            next,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              height: 1.6,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            tr(
              context,
              'Tu progreso se actualiza al responder.',
              'Your progress updates as you answer.',
            ),
            style: const TextStyle(fontSize: 11, color: Color(0xFFCFDEF4)),
          ),
        ],
      ),
    );
  }

  Widget _configuration() {
    final c = WfColors.of(context);
    return _panel(
      Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _heading(
            '01',
            tr(context, 'Configura tu meta', 'Set your goal'),
            tr(
              context,
              'Elige tu ritmo y las pruebas que preparas.',
              'Choose your pace and the tests you are preparing for.',
            ),
          ),
          const SizedBox(height: 22),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: c.soft,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            tr(
                              context,
                              'Preguntas al día',
                              'Questions per day',
                            ),
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 5),
                          Text(
                            tr(context, 'Entre 1 y 20', 'Between 1 and 20'),
                            style: TextStyle(fontSize: 11, color: c.muted),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      '$goal',
                      style: TextStyle(
                        fontSize: 30,
                        fontWeight: FontWeight.w800,
                        color: c.ink,
                      ),
                    ),
                  ],
                ),
                Slider(
                  value: goal.toDouble(),
                  min: 1,
                  max: 20,
                  divisions: 19,
                  label: '$goal',
                  onChanged: saving
                      ? null
                      : (v) => setState(() => goal = v.round()),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          Text(
            tr(context, 'Tus pruebas', 'Your tests'),
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final entry in subjects.entries)
                FilterChip(
                  label: Text(
                    testName(context, entry.key, entry.value),
                    style: const TextStyle(fontSize: 12),
                  ),
                  avatar: CircleAvatar(
                    radius: 4,
                    backgroundColor: accents[entry.key],
                  ),
                  selected: tests.contains(entry.key),
                  onSelected: saving
                      ? null
                      : (selected) => setState(
                          () => selected
                              ? tests.add(entry.key)
                              : tests.remove(entry.key),
                        ),
                ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            tr(
              context,
              'La meta organiza tu práctica; no aumenta tu cuota diaria. Dificultad intermedia.',
              'Your goal organizes practice; it does not increase your daily quota. Intermediate difficulty.',
            ),
            style: TextStyle(fontSize: 11, height: 1.7, color: c.muted),
          ),
          const SizedBox(height: 18),
          FilledButton(
            onPressed: saving || tests.isEmpty ? null : _save,
            child: Text(
              saving
                  ? tr(context, 'Guardando…', 'Saving…')
                  : tr(context, 'Guardar plan', 'Save plan'),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            dirty
                ? tr(
                    context,
                    'Tienes cambios sin guardar. Guarda para actualizar las recomendaciones.',
                    'You have unsaved changes. Save to update recommendations.',
                  )
                : plan?['saved'] == false
                ? tr(
                    context,
                    'Guarda esta propuesta para conservar tu plan.',
                    'Save this suggestion to keep your plan.',
                  )
                : tr(
                    context,
                    'Tu plan está guardado. Puedes ajustarlo cuando quieras.',
                    'Your plan is saved. You can change it anytime.',
                  ),
            style: TextStyle(fontSize: 11, height: 1.7, color: c.muted),
          ),
        ],
      ),
    );
  }

  Widget _task(Map<String, dynamic> task) {
    final c = WfColors.of(context), id = task['testId'].toString();
    final accent = accents[id] ?? c.brand;
    final reason = task['reason'];
    final count = (task['scheduled'] as num).toInt();
    final available = (task['available'] as num?)?.toInt();
    final completed = (task['completed'] as num?)?.toInt() ?? 0;
    final descriptions = {
      'unavailable': tr(
        context,
        'Esta prueba aún no tiene preguntas disponibles. Puedes mantenerla en tu plan.',
        'This test has no available questions yet. You can keep it in your plan.',
      ),
      'bank_completed': tr(
        context,
        'Ya respondiste todas las preguntas disponibles de esta prueba.',
        'You have answered all available questions for this test.',
      ),
      'reinforce': tr(
        context,
        'Conviene reforzar: menos del 60% de aciertos históricos, con al menos cinco respuestas.',
        'More practice recommended: historical accuracy below 60%, with at least five answers.',
      ),
      'explore': tr(
        context,
        'Comienza a practicar para recibir recomendaciones basadas en tus respuestas.',
        'Start practicing to receive recommendations based on your answers.',
      ),
      'continue': tr(
        context,
        'Continúa avanzando en el banco disponible.',
        'Keep practicing with the available question bank.',
      ),
    };
    Widget metric(String title, String value) => Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(fontSize: 11, color: c.muted, height: 1.5),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(fontSize: 23, fontWeight: FontWeight.w800),
          ),
        ],
      ),
    );
    return _panel(
      Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                width: 46,
                height: 46,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: accent,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Text(
                  {
                        'm1': 'M1',
                        'm2': 'M2',
                        'lectora': 'CL',
                        'cien': 'CI',
                        'hist': 'HI',
                      }[id] ??
                      'PAES',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      reason == 'reinforce'
                          ? tr(context, 'Para reforzar', 'Focus area')
                          : reason == 'unavailable'
                          ? tr(context, 'Próximamente', 'Coming soon')
                          : reason == 'bank_completed'
                          ? tr(context, 'Banco completado', 'Bank completed')
                          : tr(context, 'Sigue explorando', 'Keep exploring'),
                      style: TextStyle(
                        fontSize: 10,
                        color: c.muted,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 5),
                    Text(
                      testName(context, id, task['label'].toString()),
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          Text(
            descriptions[reason] ?? '',
            style: TextStyle(fontSize: 12, height: 1.7, color: c.muted),
          ),
          const SizedBox(height: 18),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              metric(
                tr(context, 'Respuestas', 'Answers'),
                '${task['answered']}',
              ),
              const SizedBox(width: 12),
              metric(
                tr(context, 'Aciertos históricos', 'Historical accuracy'),
                task['accuracy'] == null ? '—' : '${task['accuracy']}%',
              ),
            ],
          ),
          if (available != null) ...[
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: Text(
                    tr(context, 'Banco de preguntas', 'Question bank'),
                    style: TextStyle(fontSize: 11, color: c.muted),
                  ),
                ),
                Text(
                  '$completed / $available',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 9),
            LinearProgressIndicator(
              value: available == 0
                  ? 0
                  : (completed / available).clamp(0.0, 1.0).toDouble(),
              minHeight: 6,
              color: accent,
              backgroundColor: c.soft,
              borderRadius: BorderRadius.circular(8),
            ),
          ],
          const SizedBox(height: 18),
          Divider(color: c.line),
          const SizedBox(height: 10),
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 14,
            runSpacing: 10,
            children: [
              Text.rich(
                TextSpan(
                  children: [
                    TextSpan(
                      text: '$count',
                      style: const TextStyle(
                        fontSize: 27,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    TextSpan(
                      text: tr(context, '  para hoy', '  for today'),
                      style: TextStyle(fontSize: 12, color: c.muted),
                    ),
                  ],
                ),
              ),
              FilledButton(
                onPressed: dirty || saving || count == 0
                    ? null
                    : () => context.push('/levels?testId=$id'),
                child: Text('${tr(context, 'Practicar', 'Practice')} →'),
              ),
            ],
          ),
        ],
      ),
      accent: accent,
    );
  }

  @override
  Widget build(BuildContext context) {
    final p = plan, c = WfColors.of(context);
    return Scaffold(
      appBar: AppBar(
        leading: BackButton(
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/home');
            }
          },
        ),
        title: Text(tr(context, 'Plan de estudio', 'Study plan')),
        actions: [
          IconButton(
            tooltip: tr(context, 'Actualizar progreso', 'Refresh progress'),
            onPressed: saving || loading ? null : _load,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: loading
          ? const ContentSkeleton(kind: 'study-plan')
          : ListView(
              padding: const EdgeInsets.all(20),
              children: [
                if (error != null) ...[
                  Semantics(
                    liveRegion: true,
                    child: Text(error!, style: TextStyle(color: c.danger)),
                  ),
                  TextButton(
                    onPressed: _load,
                    child: Text(tr(context, 'Reintentar', 'Retry')),
                  ),
                ],
                if (p != null) ...[
                  Text(
                    tr(context, 'TU RUTA PAES', 'YOUR PAES JOURNEY'),
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.3,
                      color: c.muted,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    tr(
                      context,
                      'Una meta clara. Un paso más cerca cada día.',
                      'A clear goal. One step closer every day.',
                    ),
                    style: TextStyle(fontSize: 13, height: 1.7, color: c.muted),
                  ),
                  const SizedBox(height: 22),
                  _today(p),
                  const SizedBox(height: 22),
                  _configuration(),
                  const SizedBox(height: 28),
                  _heading(
                    '02',
                    tr(
                      context,
                      'Recomendaciones por prueba',
                      'Recommendations by test',
                    ),
                    tr(
                      context,
                      'Empieza por las pruebas que conviene reforzar.',
                      'Start with the tests that could use more practice.',
                    ),
                  ),
                  const SizedBox(height: 20),
                  for (final raw in p['tasks'] as List) ...[
                    _task(Map<String, dynamic>.from(raw)),
                    const SizedBox(height: 16),
                  ],
                  ExpansionTile(
                    tilePadding: EdgeInsets.zero,
                    title: Text(
                      tr(
                        context,
                        '¿Cómo se organiza mi plan?',
                        'How is my plan organized?',
                      ),
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    children: [
                      Padding(
                        padding: const EdgeInsets.only(bottom: 18),
                        child: Text(
                          tr(
                            context,
                            'Las preguntas pendientes se distribuyen según tus pruebas, tu cuota diaria y el contenido disponible. Con al menos cinco respuestas, se priorizan las pruebas con menos de un 60% de aciertos históricos. Esta orientación no representa un puntaje PAES ni una evaluación de dominio.',
                            'Remaining questions are distributed according to your tests, daily quota and available content. With at least five answers, tests with historical accuracy below 60% are prioritized. This guidance is not a PAES score or a mastery assessment.',
                          ),
                          style: TextStyle(
                            fontSize: 12,
                            height: 1.8,
                            color: c.muted,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  Text(
                    tr(
                      context,
                      'Cada respuesta cuenta. Sigue construyendo tu progreso.',
                      'Every answer counts. Keep building your progress.',
                    ),
                    style: TextStyle(fontSize: 12, height: 1.7, color: c.muted),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton(
                    onPressed: () => context.go('/home'),
                    child: Text(
                      '${tr(context, 'Ver mi progreso', 'View my progress')} →',
                    ),
                  ),
                ],
              ],
            ),
    );
  }
}
