import '../../core/utils/tier_names.dart';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/l10n/l10n.dart';
import '../../core/network/api_client.dart';
import '../../core/widgets/content_skeleton.dart';

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

  @override
  Widget build(BuildContext context) {
    final p = plan;
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
            tooltip: tr(context, 'Actualizar', 'Refresh'),
            onPressed: saving || loading ? null : _load,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: loading
          ? const ContentSkeleton(kind: 'form')
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (error != null) ...[
                  Text(error!),
                  TextButton(
                    onPressed: _load,
                    child: Text(tr(context, 'Reintentar', 'Retry')),
                  ),
                ],
                if (p != null) ...[
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            tr(context, 'Configura tu meta', 'Set your goal'),
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          Text(
                            tr(
                              context,
                              'La meta organiza tu estudio; no cambia la cuota diaria.',
                              'Your goal organizes practice; it does not change your daily quota.',
                            ),
                          ),
                          Text(
                            '${tr(context, 'Preguntas diarias', 'Daily questions')}: $goal',
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
                          for (final entry in subjects.entries)
                            CheckboxListTile(
                              contentPadding: EdgeInsets.zero,
                              title: Text(
                                testName(context, entry.key, entry.value),
                              ),
                              value: tests.contains(entry.key),
                              onChanged: saving
                                  ? null
                                  : (v) => setState(
                                      () => v == true
                                          ? tests.add(entry.key)
                                          : tests.remove(entry.key),
                                    ),
                            ),
                          FilledButton(
                            onPressed: saving || tests.isEmpty ? null : _save,
                            child: Text(
                              saving
                                  ? tr(context, 'Guardando…', 'Saving…')
                                  : tr(context, 'Guardar plan', 'Save plan'),
                            ),
                          ),
                          if (dirty)
                            Text(
                              tr(
                                context,
                                'Guarda los cambios para actualizar las recomendaciones.',
                                'Save changes to update recommendations.',
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            tr(
                              context,
                              'Tu objetivo de hoy',
                              'Your goal today',
                            ),
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          const SizedBox(height: 12),
                          Text(
                            '${p['completedToday']} / ${p['settings']['dailyGoal']}',
                            style: Theme.of(context).textTheme.headlineMedium,
                          ),
                          const SizedBox(height: 12),
                          LinearProgressIndicator(
                            value:
                                ((p['completedToday'] as num) /
                                        (p['settings']['dailyGoal'] as num))
                                    .clamp(0.0, 1.0)
                                    .toDouble(),
                            minHeight: 8,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            '${tr(context, 'Día de estudio', 'Study day')}: ${p['date']} · Chile',
                          ),
                          Text(
                            p['remainingGoal'] == 0
                                ? tr(
                                    context,
                                    '¡Cumpliste tu meta!',
                                    'You reached your goal!',
                                  )
                                : p['quotaRemaining'] == 0
                                ? tr(
                                    context,
                                    'Cuota agotada por hoy.',
                                    'Daily quota reached.',
                                  )
                                : tr(
                                    context,
                                    'Preguntas propuestas: ${p['scheduled']}',
                                    'Suggested questions: ${p['scheduled']}',
                                  ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    tr(
                      context,
                      'Recomendaciones por prueba',
                      'Recommendations by test',
                    ),
                  ),
                  Text(
                    tr(
                      context,
                      'Orientación desde tus respuestas; no es puntaje PAES ni evaluación de dominio.',
                      'Guidance based on your answers; not a PAES score or mastery assessment.',
                    ),
                  ),
                  for (final raw in p['tasks'] as List)
                    Builder(
                      builder: (context) {
                        final task = Map<String, dynamic>.from(raw);
                        final reason = task['reason'];
                        final descriptions = {
                          'unavailable': tr(
                            context,
                            'Banco aún no disponible.',
                            'Question bank not available yet.',
                          ),
                          'bank_completed': tr(
                            context,
                            'Completaste el banco disponible.',
                            'Available bank completed.',
                          ),
                          'reinforce': tr(
                            context,
                            'Conviene reforzar según tus aciertos históricos.',
                            'Reinforce based on historical accuracy.',
                          ),
                          'explore': tr(
                            context,
                            'Aún hay pocas respuestas para orientar la recomendación.',
                            'Not enough answers for a recommendation yet.',
                          ),
                          'continue': tr(
                            context,
                            'Continúa avanzando.',
                            'Keep practicing.',
                          ),
                        };
                        return Card(
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  testName(
                                    context,
                                    task['testId'].toString(),
                                    task['label'].toString(),
                                  ),
                                  style: Theme.of(context)
                                      .textTheme
                                      .titleMedium,
                                ),
                                Text(descriptions[reason] ?? ''),
                                Text(
                                  '${task['answered']} ${tr(context, 'respuestas', 'answers')} · ${task['accuracy'] ?? '—'}%',
                                ),
                                Text(
                                  '${task['scheduled']} ${tr(context, 'preguntas propuestas', 'suggested questions')}',
                                ),
                                OutlinedButton(
                                  onPressed:
                                      dirty ||
                                          saving ||
                                          (task['scheduled'] as num) == 0
                                      ? null
                                      : () => context.push(
                                          '/levels?testId=${task['testId']}',
                                        ),
                                  child: Text(
                                    tr(context, 'Practicar', 'Practice'),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                ],
              ],
            ),
    );
  }
}
