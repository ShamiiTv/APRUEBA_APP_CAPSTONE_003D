import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/l10n/l10n.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/wf_colors.dart';
import '../../core/utils/tier_names.dart';
import '../../core/widgets/medal_toast.dart';
import '../../core/widgets/wf_widgets.dart';
import '../../data/practice_models.dart';
import '../auth/auth_providers.dart';
import 'practice_providers.dart';
import 'practice_repository.dart';

class PracticeScreen extends ConsumerStatefulWidget {
  const PracticeScreen({super.key});

  @override
  ConsumerState<PracticeScreen> createState() => _PracticeScreenState();
}

class _PracticeScreenState extends ConsumerState<PracticeScreen> {
  bool _loading = true;
  bool _submitting = false;
  bool _noMore = false;
  bool _onlyEmpty = false;
  String? _error;

  PracticeQuestion? _question;
  QuotaInfo? _quota;
  String? _selected;
  AnswerResult? _result;
  int _elapsedMs = 0;

  final Stopwatch _watch = Stopwatch();
  final ValueNotifier<int> _seconds = ValueNotifier<int>(0);
  Timer? _ticker;

  @override
  void initState() {
    super.initState();
    _loadNext();
  }

  @override
  void dispose() {
    _ticker?.cancel();
    _seconds.dispose();
    super.dispose();
  }

  // ── Cronómetro ──
  void _startTimer() {
    _ticker?.cancel();
    _watch
      ..reset()
      ..start();
    _seconds.value = 0;
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      _seconds.value = _watch.elapsed.inSeconds;
    });
  }

  void _stopTimer() {
    _watch.stop();
    _ticker?.cancel();
  }

  void _resumeTimer() {
    _watch.start();
    _ticker?.cancel();
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      _seconds.value = _watch.elapsed.inSeconds;
    });
  }

  String _fmt(int s) {
    final m = s ~/ 60;
    final r = (s % 60).toString().padLeft(2, '0');
    return '$m:$r';
  }

  // ── Datos ──
  /// ¿Todas las pruebas que eligió el alumno están sin preguntas?
  Future<bool> _chosenTestsAreEmpty() async {
    try {
      ref.invalidate(testsProvider);
      final tests = await ref.read(testsProvider.future);
      final profile = await ref.read(profileProvider.future);
      final chosen = profile.selectedTests;
      return chosen.isNotEmpty &&
          chosen.every((id) => !tests.any((t) => t.id == id && t.hasQuestions));
    } catch (_) {
      return false;
    }
  }

  String _labelOf(String testId) {
    final tests = ref.read(testsProvider).value ?? const <PracticeTest>[];
    for (final t in tests) {
      if (t.id == testId) return testName(context, t.id, t.label);
    }
    return '';
  }

  Future<void> _loadNext() async {
    setState(() {
      _loading = true;
      _error = null;
      _selected = null;
      _result = null;
    });

    try {
      // Las etiquetas de las pruebas (p. ej. "Matemática M1") vienen de /tests.
      try {
        await ref.read(testsProvider.future);
      } catch (_) {}
      final next = await ref.read(practiceRepositoryProvider).next();
      final onlyEmpty = next.allCompleted
          ? await _chosenTestsAreEmpty()
          : false;
      if (!mounted) return;
      setState(() {
        _question = next.question;
        _quota = next.quota ?? _quota;
        _noMore = next.allCompleted;
        _onlyEmpty = onlyEmpty;
      });
      if (next.question != null) _startTimer();
    } on PracticeException catch (e) {
      if (!mounted) return;
      if (e.isQuotaExceeded) {
        context.go('/unlock/${e.nextStep ?? 'upgrade'}');
        return;
      }
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _submit() async {
    final q = _question;
    final sel = _selected;
    if (q == null || sel == null || _submitting) return;

    _stopTimer();
    _elapsedMs = _watch.elapsedMilliseconds;
    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      final result = await ref
          .read(practiceRepositoryProvider)
          .answer(questionId: q.id, selectedOption: sel, elapsedMs: _elapsedMs);
      if (!mounted) return;
      setState(() {
        _result = result;
        _quota = result.quota ?? _quota;
      });
      if (result.isCorrect && result.bronzeEarned > 0) {
        showMedalToast(context, 'bronze', result.bronzeEarned);
      }
      // Actualiza cuota, medallas y progreso en Inicio.
      ref.read(profileProvider.notifier).refresh();
      ref.invalidate(progressProvider);
    } on PracticeException catch (e) {
      if (!mounted) return;
      if (e.isQuotaExceeded) {
        context.go('/unlock/${e.nextStep ?? 'upgrade'}');
        return;
      }
      if (e.code == 'ALREADY_ANSWERED') {
        await _loadNext();
        return;
      }
      setState(() => _error = e.message);
      _resumeTimer();
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  // ── Pantalla ──
  String _title() {
    if (_result != null) return tr(context, 'Resultado', 'Result');
    final q = _quota;
    if (_question == null || q == null) {
      return tr(context, 'Práctica', 'Practice');
    }
    final n = q.used + 1;
    return (q.unlimited || q.max == null)
        ? tr(context, 'Pregunta $n', 'Question $n')
        : tr(context, 'Pregunta $n de ${q.max}', 'Question $n of ${q.max}');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_title()),
        leading: BackButton(onPressed: () => context.go('/home')),
      ),
      body: _body(context),
    );
  }

  Widget _body(BuildContext context) {
    final c = WfColors.of(context);

    if (_loading) return const Center(child: CircularProgressIndicator());

    if (_error != null && _question == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                _error!,
                textAlign: TextAlign.center,
                style: TextStyle(color: c.danger),
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: _loadNext,
                child: Text(tr(context, 'Reintentar', 'Retry')),
              ),
            ],
          ),
        ),
      );
    }

    if (_noMore || _question == null) return _noMoreView();
    return _result == null ? _questionView() : _resultView();
  }

  Widget _noMoreView() {
    final c = WfColors.of(context);
    final title = _onlyEmpty
        ? tr(
            context,
            'Tus pruebas todavía no tienen preguntas',
            'Your tests don\'t have questions yet',
          )
        : tr(
            context,
            'No quedan preguntas para tus filtros',
            'No questions left for your filters',
          );
    final body = _onlyEmpty
        ? tr(
            context,
            'Las pruebas que elegiste aún no tienen preguntas cargadas. Elige también Matemática M1 o Competencia Lectora para practicar.',
            'The tests you chose don\'t have questions loaded yet. Also pick Math M1 or Reading Comprehension to practice.',
          )
        : tr(
            context,
            'Ya respondiste todas las preguntas de tu dificultad en estas pruebas. Prueba con otra dificultad u otras pruebas.',
            'You already answered every question of your difficulty in these tests. Try another difficulty or other tests.',
          );

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              _onlyEmpty ? '🛠️' : '🎉',
              style: const TextStyle(fontSize: 40),
            ),
            const SizedBox(height: 12),
            Text(
              title,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              body,
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(fontSize: 13, color: c.muted),
            ),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: () => context.push('/select-tests?from=settings'),
              child: Text(
                tr(
                  context,
                  'Cambiar pruebas o dificultad',
                  'Change tests or difficulty',
                ),
              ),
            ),
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: () => context.go('/home'),
              child: Text(tr(context, 'Volver al inicio', 'Back to home')),
            ),
          ],
        ),
      ),
    );
  }

  Widget _questionView() {
    final c = WfColors.of(context);
    final q = _question!;
    final quota = _quota;
    final max = quota?.max;
    final n = (quota?.used ?? 0) + 1;
    final counter = max == null
        ? tr(context, 'Pregunta $n', 'Question $n')
        : tr(context, 'Pregunta $n de $max', 'Question $n of $max');
    final level = difficultyName(context, q.difficulty);
    final tag = [
      if (_labelOf(q.testId).isNotEmpty) _labelOf(q.testId),
      ?level,
    ].join(' · ');

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
      children: [
        Row(
          children: [
            Text(
              counter,
              style: GoogleFonts.inter(fontSize: 11, color: c.muted),
            ),
            const Spacer(),
            const Text('⏱️', style: TextStyle(fontSize: 14)),
            const SizedBox(width: 5),
            ValueListenableBuilder<int>(
              valueListenable: _seconds,
              builder: (context, v, _) => Text(
                _fmt(v),
                style: GoogleFonts.montserrat(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  color: c.ink,
                ),
              ),
            ),
          ],
        ),
        if (max != null) ...[const SizedBox(height: 8), WfBar(value: n / max)],
        if (tag.isNotEmpty) ...[
          const SizedBox(height: 10),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: c.chip,
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              tag,
              style: GoogleFonts.inter(
                fontSize: 10,
                fontWeight: FontWeight.w700,
                color: c.muted,
              ),
            ),
          ),
        ],
        const SizedBox(height: 14),
        Text(
          q.statement,
          style: GoogleFonts.inter(
            fontSize: 17,
            fontWeight: FontWeight.w700,
            height: 1.35,
            color: c.ink,
          ),
        ),
        const SizedBox(height: 4),
        for (final o in q.options) _optionTile(o),
        const SizedBox(height: 16),
        Text(
          tr(
            context,
            'El cronómetro mide tu velocidad de respuesta.',
            'The timer measures your answer speed.',
          ),
          style: GoogleFonts.inter(fontSize: 11, color: c.muted),
        ),
        if (_error != null) ...[
          const SizedBox(height: 8),
          Text(_error!, style: TextStyle(color: c.danger)),
        ],
        const SizedBox(height: 8),
        FilledButton(
          onPressed: (_selected == null || _submitting) ? null : _submit,
          child: _submitting
              ? const SizedBox(
                  height: 20,
                  width: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: AppColors.azul,
                  ),
                )
              : Text(tr(context, 'Comprobar respuesta', 'Check answer')),
        ),
      ],
    );
  }

  Widget _optionTile(PracticeOption opt) {
    final c = WfColors.of(context);
    final answered = _result != null;
    final correctIds = _result?.correctAnswers ?? const <String>[];
    final isOk = answered && correctIds.contains(opt.id);
    final isNo = answered && opt.id == _selected && !isOk;
    final isSel = !answered && opt.id == _selected;

    Color border = c.line;
    Color? fill;
    Color circleBg = Colors.transparent;
    Color circleBorder = c.line;
    Color circleFg = c.ink;

    if (isOk) {
      border = c.success;
      fill = c.success.withValues(alpha: 0.08);
      circleBg = c.success;
      circleBorder = c.success;
      circleFg = Colors.white;
    } else if (isNo) {
      border = c.danger;
      fill = c.danger.withValues(alpha: 0.06);
      circleBg = c.danger;
      circleBorder = c.danger;
      circleFg = Colors.white;
    } else if (isSel) {
      border = c.brand;
      fill = c.brand.withValues(alpha: 0.06);
      circleBg = c.brand;
      circleBorder = c.brand;
      circleFg = Colors.white;
    }

    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: answered ? null : () => setState(() => _selected = opt.id),
        child: Ink(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: fill,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: border, width: 1.5),
          ),
          child: Row(
            children: [
              Container(
                width: 24,
                height: 24,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: circleBg,
                  border: Border.all(color: circleBorder, width: 1.5),
                ),
                child: Text(
                  opt.id,
                  style: GoogleFonts.montserrat(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: circleFg,
                  ),
                ),
              ),
              const SizedBox(width: 9),
              Expanded(
                child: Text(
                  opt.text,
                  style: GoogleFonts.inter(fontSize: 14, color: c.ink),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _resultView() {
    final c = WfColors.of(context);
    final r = _result!;
    final q = _question!;
    final ok = r.isCorrect;
    final tone = ok ? c.success : c.danger;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 20),
      children: [
        Center(
          child: Text(ok ? '✅' : '❌', style: const TextStyle(fontSize: 42)),
        ),
        const SizedBox(height: 6),
        Center(
          child: Text(
            ok
                ? tr(context, '¡Correcto!', 'Correct!')
                : tr(context, 'Incorrecto', 'Incorrect'),
            style: GoogleFonts.montserrat(
              fontSize: 17,
              fontWeight: FontWeight.w700,
              color: tone,
            ),
          ),
        ),
        const SizedBox(height: 4),
        for (final o in q.options) _optionTile(o),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(13),
            child: Text(
              r.explanation,
              style: GoogleFonts.inter(
                fontSize: 12,
                height: 1.5,
                color: c.muted,
              ),
            ),
          ),
        ),
        if (ok && r.bronzeEarned > 0) ...[
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: AppColors.bronze.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.bronze),
            ),
            child: Row(
              children: [
                const MedalCoin(tier: 'bronze', size: 28),
                const SizedBox(width: 9),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '+${r.bronzeEarned} ${tierName(context, 'bronze')}',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF7A4A10),
                      ),
                    ),
                    Text(
                      tr(context, 'Respuesta correcta', 'Correct answer'),
                      style: GoogleFonts.inter(
                        fontSize: 10,
                        color: const Color(0xFF7A4A10),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 8),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(13),
          decoration: BoxDecoration(
            color: c.success.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: c.success, width: 1.5),
          ),
          child: Text(
            r.cohortPercentile == null
                ? tr(
                    context,
                    '⚡ Respondiste en ${_fmt((_elapsedMs / 1000).round())}',
                    '⚡ You answered in ${_fmt((_elapsedMs / 1000).round())}',
                  )
                : tr(
                    context,
                    '⚡ Respondiste en ${_fmt((_elapsedMs / 1000).round())} · más rápido que el ${r.cohortPercentile}% de quienes ya respondieron esta pregunta.',
                    '⚡ You answered in ${_fmt((_elapsedMs / 1000).round())} · faster than ${r.cohortPercentile}% of people who already answered this question.',
                  ),
            style: GoogleFonts.inter(fontSize: 11, color: c.muted),
          ),
        ),
        const SizedBox(height: 10),
        OutlinedButton(
          onPressed: () => context.push(
            '/practice/explanation',
            extra: ExplanationArgs(
              questionId: q.id,
              testLabel: _labelOf(q.testId),
              statement: q.statement,
              difficulty: q.difficulty,
              axis: q.axis,
              correctAnswer: r.correctAnswers.isNotEmpty
                  ? r.correctAnswers.first
                  : '',
            ),
          ),
          child: Text(
            tr(
              context,
              '📖 Ver explicación detallada',
              '📖 See detailed explanation',
            ),
          ),
        ),
        const SizedBox(height: 8),
        OutlinedButton(
          onPressed: () => context.push(
            '/groups/share',
            extra: <String, dynamic>{
              'questionId': q.id,
              'statement': q.statement,
              'isCorrect': r.isCorrect,
              'elapsedMs': _elapsedMs,
            },
          ),
          child: Text(tr(context, 'Compartir al grupo', 'Share with group')),
        ),
        const SizedBox(height: 8),
        FilledButton(
          onPressed: _loadNext,
          child: Text(tr(context, 'Siguiente pregunta', 'Next question')),
        ),
      ],
    );
  }
}
