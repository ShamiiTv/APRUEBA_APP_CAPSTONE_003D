import '../../core/network/api_client.dart';

import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';

import '../../core/l10n/l10n.dart';
import '../../core/theme/wf_colors.dart';

class FacsimileRepository {
  Future<Map<String, dynamic>> catalog() async => Map<String, dynamic>.from(
    (await ApiClient.dio.get('/practice/facsimiles')).data['data'],
  );
  Future<Map<String, dynamic>> get(String id) async =>
      Map<String, dynamic>.from(
        (await ApiClient.dio.get('/practice/facsimiles/$id')).data['data'],
      );
  Future<Map<String, dynamic>> command(
    String path,
    Map<String, dynamic> body,
  ) async => Map<String, dynamic>.from(
    (await ApiClient.dio.post(
      '/practice/facsimiles$path',
      data: body,
    )).data['data'],
  );
}

final facsimileRepositoryProvider = Provider((ref) => FacsimileRepository());

class FacsimileScreen extends ConsumerStatefulWidget {
  const FacsimileScreen({super.key});
  @override
  ConsumerState<FacsimileScreen> createState() => _FacsimileState();
}

class _FacsimileState extends ConsumerState<FacsimileScreen> {
  Map<String, dynamic>? catalog, session;
  String test = 'm1', difficulty = 'd2', choice = '', errorCode = '';
  String? requestId;
  bool busy = false;
  final count = TextEditingController(text: '10');
  final watch = Stopwatch();
  String t(String es, String en) => tr(context, es, en);
  @override
  void initState() {
    super.initState();
    Future.microtask(load);
  }

  @override
  void dispose() {
    count.dispose();
    watch.stop();
    super.dispose();
  }

  String name(String id) => switch (id) {
    'm1' => t('Matemática M1', 'Mathematics M1'),
    'm2' => t('Matemática M2', 'Mathematics M2'),
    'lectora' => t('Competencia Lectora', 'Reading'),
    'cien' => t('Ciencias', 'Science'),
    _ => t('Historia', 'History'),
  };
  String level(String id) => id == 'd1'
      ? t('Básica', 'Basic')
      : id == 'd2'
      ? t('Intermedia', 'Intermediate')
      : t('Avanzada', 'Advanced');
  int get available {
    for (final item in catalog?['catalog'] ?? []) {
      if (item['id'] == test) {
        for (final itemLevel in item['levels']) {
          if (itemLevel['id'] == difficulty) {
            return itemLevel['available'] as int;
          }
        }
      }
    }
    return 0;
  }

  List<dynamic> get levels {
    for (final item in catalog?['catalog'] ?? []) {
      if (item['id'] == test) return item['levels'];
    }
    return [];
  }

  void adjust(String id) {
    test = id;
    final selected = levels;
    final valid = selected.where((v) => v['available'] > 0).toList();
    if (!valid.any((v) => v['id'] == difficulty) && valid.isNotEmpty) {
      difficulty = valid.first['id'];
    }
    count.text = min(10, min(100, available)).toString();
    requestId = null;
  }

  Future<void> load({bool restore = true}) async {
    try {
      final result = await ref.read(facsimileRepositoryProvider).catalog();
      if (!mounted) return;
      setState(() {
        final first = catalog == null;
        catalog = result;
        errorCode = '';
        if (first) {
          final eligible = (result['catalog'] as List).where(
            (v) => (v['levels'] as List).any((l) => l['available'] > 0),
          );
          adjust(eligible.isEmpty ? 'm1' : eligible.first['id']);
        }
      });
      if (restore && result['activeId'] != null) await open(result['activeId']);
    } catch (e) {
      if (mounted) setState(() => errorCode = code(e));
    }
  }

  String code(Object e) {
    if (e is DioException) {
      final body = e.response?.data;
      final error = body is Map ? body['error'] : null;
      final details = error is Map ? error['details'] : null;
      return details is Map
          ? details['code']?.toString() ?? 'FACSIMILE_UNAVAILABLE'
          : 'FACSIMILE_UNAVAILABLE';
    }
    return 'FACSIMILE_UNAVAILABLE';
  }

  String get error => errorCode == 'FACSIMILE_PREMIUM'
      ? t(
          'Necesitas Acceso completo vigente. Tu avance está guardado.',
          'You need active Full access. Your progress is saved.',
        )
      : errorCode == 'FACSIMILE_CONFLICT'
      ? t(
          'La pregunta cambió en otro dispositivo. Recupera tu avance antes de continuar.',
          'The question changed on another device. Recover your progress before continuing.',
        )
      : t(
          'No se pudo actualizar el facsímil. Recupera tu avance o reintenta.',
          'Could not update the mock exam. Recover your progress or retry.',
        );
  void apply(Map<String, dynamic> value) {
    if (!mounted) return;
    setState(() {
      session = value;
      choice = '';
      errorCode = '';
    });
    watch
      ..reset()
      ..start();
  }

  Future<void> open(String id) async {
    if (busy) return;
    setState(() => busy = true);
    try {
      apply(await ref.read(facsimileRepositoryProvider).get(id));
    } catch (e) {
      if (mounted) setState(() => errorCode = code(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> start() async {
    if (busy) return;
    setState(() => busy = true);
    requestId ??=
        'fc_${DateTime.now().microsecondsSinceEpoch}_${Random.secure().nextInt(1 << 30)}';
    try {
      final value = await ref.read(facsimileRepositoryProvider).command('', {
        'requestId': requestId,
        'testId': test,
        'difficulty': difficulty,
        'count': int.tryParse(count.text),
      });
      apply(value);
      if (mounted) await load(restore: false);
    } catch (e) {
      if (mounted) {
        setState(() => errorCode = code(e));
        if (errorCode == 'FACSIMILE_ACTIVE') await load();
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> answer() async {
    if (busy || choice.isEmpty || session?['question'] == null) return;
    setState(() => busy = true);
    try {
      final s = session!,
          result = await ref.read(facsimileRepositoryProvider).command(
            '/${s['id']}/answers',
            {
              'index': s['index'],
              'questionId': s['question']['id'],
              'option': choice,
              'elapsedMs': min(3600000, watch.elapsedMilliseconds),
            },
          );
      apply(result);
      if (mounted && result['status'] != 'active') await load(restore: false);
    } catch (e) {
      if (mounted) setState(() => errorCode = code(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> cancel() async {
    final yes = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(t('¿Finalizar este ensayo?', 'Finish this mock exam?')),
        content: Text(
          t(
            'Se guardarán las respuestas enviadas. Para seguir otro día, cierra este aviso y sal de la pantalla.',
            'Submitted answers will be saved. To resume later, close this dialog and leave the screen.',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(t('Seguir respondiendo', 'Keep answering')),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(t('Finalizar ensayo', 'Finish mock exam')),
          ),
        ],
      ),
    );
    if (yes != true || !mounted || busy) return;
    setState(() => busy = true);
    try {
      apply(
        await ref
            .read(facsimileRepositoryProvider)
            .command('/${session!['id']}/cancel', {}),
      );
      if (mounted) await load(restore: false);
    } catch (e) {
      if (mounted) setState(() => errorCode = code(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Widget card(List<Widget> children) => Padding(
    padding: const EdgeInsets.only(bottom: 18),
    child: Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: children,
        ),
      ),
    ),
  );
  Widget title(String value) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: Text(value, style: Theme.of(context).textTheme.titleLarge),
  );
  Widget text(String value) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: Text(
      value,
      style: TextStyle(color: WfColors.of(context).muted, height: 1.65),
    ),
  );
  Widget button(
    String label,
    VoidCallback? onPressed, {
    bool secondary = false,
  }) => Padding(
    padding: const EdgeInsets.only(top: 12),
    child: SizedBox(
      width: double.infinity,
      child: secondary
          ? OutlinedButton(
              onPressed: busy ? null : onPressed,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Text(label, textAlign: TextAlign.center),
              ),
            )
          : FilledButton(
              onPressed: busy ? null : onPressed,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Text(label, textAlign: TextAlign.center),
              ),
            ),
    ),
  );
  @override
  Widget build(BuildContext context) {
    final c = WfColors.of(context),
        s = session,
        quantity = int.tryParse(count.text) ?? 0;
    return Scaffold(
      appBar: AppBar(
        title: Text(t('Facsímil', 'Mock exams')),
        leading: BackButton(onPressed: () => context.go('/practice')),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 18, 16, 28),
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            margin: const EdgeInsets.only(bottom: 20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF123D51), Color(0xFF31538F)],
              ),
              borderRadius: BorderRadius.circular(22),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(
                  Icons.menu_book_rounded,
                  color: Color(0xFFFFCA69),
                  size: 34,
                ),
                const SizedBox(height: 18),
                Text(
                  t('Tu prueba, a tu ritmo.', 'Your test, your pace.'),
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                    fontSize: 27,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  t(
                    'Preguntas en orden fijo. Revisión completa al terminar.',
                    'Fixed-order questions. A full review when you finish.',
                  ),
                  style: const TextStyle(color: Color(0xFFE2EDF7), height: 1.6),
                ),
              ],
            ),
          ),
          if (errorCode.isNotEmpty)
            card([
              text(error),
              button(
                t('Recuperar avance', 'Recover progress'),
                () => s == null ? load() : open(s['id']),
                secondary: true,
              ),
            ]),
          if (catalog == null)
            card([
              const LinearProgressIndicator(),
              const SizedBox(height: 22),
              text(t('Preparando Facsímil…', 'Preparing Mock exams…')),
            ])
          else if (s != null)
            _session(s)
          else if (catalog!['access'] != true)
            card([
              const Icon(Icons.workspace_premium_outlined, size: 40),
              const SizedBox(height: 18),
              title(
                t('Incluido en Acceso completo', 'Included in Full access'),
              ),
              text(
                t(
                  'El plan mensual de \$4.990 permite elegir prueba, dificultad disponible y cantidad de preguntas, en orden fijo.',
                  'The \$4,990 monthly plan lets you choose a test, available difficulty and question count, in a fixed order.',
                ),
              ),
              button(
                t('Ver planes', 'View plans'),
                () => context.push('/plans'),
              ),
            ])
          else
            card([
              title(t('Prepara tu ensayo', 'Set up your mock exam')),
              text(
                t(
                  'Selecciona lo que quieres practicar. Se conserva el orden del banco de Aprueba.',
                  'Choose what you want to practise. Questions keep their order in the Aprueba bank.',
                ),
              ),
              if (catalog!['activeId'] != null)
                button(
                  t('Continuar mi ensayo', 'Resume my mock exam'),
                  () => open(catalog!['activeId']),
                ),
              DropdownButtonFormField<String>(
                initialValue: test,
                decoration: InputDecoration(labelText: t('Prueba', 'Test')),
                isExpanded: true,
                items: [
                  for (final item in catalog!['catalog'])
                    DropdownMenuItem(
                      value: item['id'],
                      enabled: (item['levels'] as List).any(
                        (v) => v['available'] > 0,
                      ),
                      child: Text(name(item['id'])),
                    ),
                ],
                onChanged: busy
                    ? null
                    : (value) {
                        if (value != null) setState(() => adjust(value));
                      },
              ),
              const SizedBox(height: 20),
              DropdownButtonFormField<String>(
                key: ValueKey('$test-$difficulty'),
                initialValue: difficulty,
                decoration: InputDecoration(
                  labelText: t('Dificultad', 'Difficulty'),
                ),
                isExpanded: true,
                items: [
                  for (final item in levels)
                    DropdownMenuItem(
                      value: item['id'],
                      enabled: item['available'] > 0,
                      child: Text(
                        '${level(item['id'])} · ${item['available']} ${t('preguntas', 'questions')}',
                      ),
                    ),
                ],
                onChanged: busy
                    ? null
                    : (value) {
                        if (value != null) {
                          setState(() {
                            difficulty = value;
                            count.text = min(
                              10,
                              min(100, available),
                            ).toString();
                            requestId = null;
                          });
                        }
                      },
              ),
              const SizedBox(height: 20),
              TextField(
                controller: count,
                enabled: !busy,
                keyboardType: TextInputType.number,
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(3),
                ],
                decoration: InputDecoration(
                  labelText: t('Cantidad de preguntas', 'Question count'),
                  helperText:
                      '${t('Disponibles', 'Available')}: $available · ${t('Máximo 100 por ensayo', 'Up to 100 per mock exam')}',
                ),
                onChanged: (_) => setState(() => requestId = null),
              ),
              const SizedBox(height: 14),
              button(
                busy
                    ? t('Preparando ensayo…', 'Preparing mock exam…')
                    : t('Comenzar facsímil', 'Start mock exam'),
                catalog!['activeId'] != null ||
                        quantity < 1 ||
                        quantity > min(100, available)
                    ? null
                    : start,
              ),
              const SizedBox(height: 15),
              text(
                t(
                  'Preguntas de Aprueba, no un facsímil oficial. No genera medallas ni modifica tu cuota, racha o meta de práctica.',
                  'Aprueba questions, not an official exam paper. Does not award medals or change your practice quota, streak or goal.',
                ),
              ),
            ]),
          if (catalog != null &&
              s == null &&
              (catalog!['history'] as List).isNotEmpty)
            card([
              title(t('Tus ensayos recientes', 'Your recent mock exams')),
              for (final item in catalog!['history'])
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(
                    '${name(item['testId'])} · ${level(item['difficulty'])}',
                  ),
                  subtitle: Text(
                    MaterialLocalizations.of(context).formatMediumDate(
                      DateTime.fromMillisecondsSinceEpoch(item['createdAt']),
                    ),
                  ),
                  trailing: Text(
                    item['status'] == 'active'
                        ? t('Continuar', 'Resume')
                        : '${item['correct']} / ${item['answered']}',
                  ),
                  onTap: busy ? null : () => open(item['id']),
                ),
            ]),
          TextButton(
            onPressed: () => context.go('/practice'),
            child: Text(t('Volver a práctica', 'Back to practice')),
          ),
          if (busy) LinearProgressIndicator(color: c.brand),
        ],
      ),
    );
  }

  Widget _session(Map<String, dynamic> s) {
    final q = s['question'];
    return card([
      title(name(s['testId'])),
      text(level(s['difficulty'])),
      if (s['status'] == 'active') ...[
        text('${t('Pregunta', 'Question')} ${s['index'] + 1} / ${s['total']}'),
        LinearProgressIndicator(value: (s['answered'] / s['total']).toDouble()),
        const SizedBox(height: 24),
        if (s['canContinue'] != true) ...[
          title(t('Tu avance está guardado', 'Your progress is saved')),
          text(
            t(
              'Activa Acceso completo para continuar desde esta pregunta.',
              'Activate Full access to continue from this question.',
            ),
          ),
          button(
            t('Ver mi suscripción', 'View my subscription'),
            () => context.push('/plans'),
          ),
        ] else if (q != null) ...[
          title(q['statement']),
          for (final o in q['options'])
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    alignment: Alignment.centerLeft,
                    padding: const EdgeInsets.all(18),
                    side: BorderSide(
                      color: choice == o['id']
                          ? WfColors.of(context).brand
                          : WfColors.of(context).line,
                      width: choice == o['id'] ? 2 : 1,
                    ),
                  ),
                  onPressed: busy
                      ? null
                      : () => setState(() => choice = o['id']),
                  child: Text(
                    '${o['id']}. ${o['text']}',
                    style: TextStyle(
                      color: WfColors.of(context).ink,
                      height: 1.6,
                    ),
                  ),
                ),
              ),
            ),
          button(
            s['index'] + 1 == s['total']
                ? t('Enviar y ver resultado', 'Submit and view results')
                : t('Enviar y continuar', 'Submit and continue'),
            choice.isEmpty ? null : answer,
          ),
        ],
        const SizedBox(height: 18),
        text(
          t(
            'Tu avance se guarda al enviar cada respuesta. Puedes salir y continuar más tarde.',
            'Your progress is saved with each submitted answer. You can leave and resume later.',
          ),
        ),
        button(
          t('Finalizar antes de completar', 'Finish early'),
          cancel,
          secondary: true,
        ),
      ] else ...[
        title(
          s['status'] == 'finished'
              ? t('¡Ensayo completado!', 'Mock exam completed!')
              : t(
                  'Ensayo finalizado antes de completar',
                  'Mock exam finished early',
                ),
        ),
        Text(
          '${s['correct']} / ${s['answered']}',
          style: TextStyle(
            fontSize: 42,
            fontWeight: FontWeight.w800,
            color: WfColors.of(context).brand,
          ),
        ),
        text(t('respuestas correctas', 'correct answers')),
        text(
          s['answered'] > 0
              ? "${(100 * s['correct'] / s['answered']).round()}${t(' % de aciertos sobre lo respondido', '% accuracy on answered questions')}"
              : t('Sin respuestas para calcular el porcentaje',
                  'Answer a question to calculate accuracy'),
        ),
        text(
          '${t('Preguntas completadas', 'Questions completed')}: ${s['answered']} / ${s['total']}. ${t('No es puntaje PAES.', 'This is not a PAES score.')}',
        ),
        for (final item in s['review'])
          ExpansionTile(
            tilePadding: EdgeInsets.zero,
            leading: Icon(
              item['isCorrect'] == true
                  ? Icons.check_circle_outline
                  : Icons.cancel_outlined,
            ),
            title: Text(item['statement']),
            children: [
              Align(
                alignment: Alignment.centerLeft,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    text(
                      '${t('Tu respuesta', 'Your answer')}: ${option(item, item['selectedOption'])}',
                    ),
                    text(
                      '${t('Respuesta correcta', 'Correct answer')}: ${option(item, item['correctAnswer'])}',
                    ),
                    text(item['explanation']),
                    if ((item['keyConcept'] as String).isNotEmpty) ...[
                      title(t('Concepto clave', 'Key concept')),
                      text(item['keyConcept']),
                    ],
                  ],
                ),
              ),
            ],
          ),
        const SizedBox(height: 22),
        title(t('¿Necesitas apoyo personalizado?', 'Need personal support?')),
        text(
          t(
            'Encuentra un tutor para reforzar esta materia. Disponible con Acceso completo vigente.',
            'Find a tutor to strengthen this subject. Available with active Full access.',
          ),
        ),
        button(
          t('Explorar tutores', 'Explore tutors'),
          () => context.push('/tutors'),
          secondary: true,
        ),
        button(
          t('Volver a Facsímil', 'Back to Mock exams'),
          () => setState(() {
            session = null;
            requestId = null;
            choice = '';
          }),
        ),
      ],
    ]);
  }

  String option(dynamic item, dynamic id) {
    for (final o in item['options']) {
      if (o['id'] == id) return o['text'];
    }
    return t('Sin respuesta', 'No answer');
  }
}
