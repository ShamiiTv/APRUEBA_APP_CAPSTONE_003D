import 'package:flutter/foundation.dart' show kDebugMode;
import 'package:flutter/material.dart';

import '../../core/utils/tier_names.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/l10n/l10n.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/wf_colors.dart';
import '../../core/widgets/wf_widgets.dart';
import '../../data/practice_models.dart';
import '../auth/auth_providers.dart';
import 'practice_providers.dart';
import 'practice_repository.dart';

/// "Solicitar recorrección" (POST /corrections). Estados: formulario → enviada → recompensa.
class CorrectionScreen extends ConsumerStatefulWidget {
  const CorrectionScreen({super.key, required this.args});

  final ExplanationArgs args;

  @override
  ConsumerState<CorrectionScreen> createState() => _CorrectionScreenState();
}

enum _Stage { form, sent, rewarded }

class _CorrectionScreenState extends ConsumerState<CorrectionScreen> {
  static const _reasons = [
    (
      'wrong_answer',
      'La respuesta marcada como correcta es incorrecta',
      'The answer marked as correct is wrong',
    ),
    (
      'ambiguous',
      'El enunciado de la pregunta es ambiguo o confuso',
      'The question statement is ambiguous or confusing',
    ),
    (
      'typo',
      'Hay un error tipográfico o de redacción',
      'There is a typo or wording error',
    ),
    (
      'bad_explanation',
      'La explicación es incorrecta o incompleta',
      'The explanation is wrong or incomplete',
    ),
    ('other', 'Otro motivo', 'Other reason'),
  ];

  final _comment = TextEditingController();
  String _reason = 'wrong_answer';
  _Stage _stage = _Stage.form;
  String? _correctionId;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _comment.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final item = await ref
          .read(practiceRepositoryProvider)
          .createCorrection(
            questionId: widget.args.questionId,
            reason: _reason,
            comment: _comment.text,
          );
      ref.invalidate(correctionsProvider);
      if (mounted) {
        setState(() {
          _correctionId = item.id;
          _stage = _Stage.sent;
        });
      }
    } on PracticeException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  /// Solo demostración (equivale al botón "Simular: confirmar error" del wireframe).
  Future<void> _simulateConfirm() async {
    final id = _correctionId;
    if (id == null) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(practiceRepositoryProvider).demoConfirmCorrection(id);
      ref.invalidate(correctionsProvider);
      await ref.read(profileProvider.notifier).refresh();
      if (mounted) setState(() => _stage = _Stage.rewarded);
    } on PracticeException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Widget _questionCard(WfColors c) {
    final a = widget.args;
    final level = difficultyName(context, a.difficulty);
    final head = [
      if (a.testLabel.isNotEmpty) testName(context, a.testLabel, a.testLabel),
      ?level,
      if (a.axis.isNotEmpty) axisName(context, a.axis),
    ].join(' · ');
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('📝', style: TextStyle(fontSize: 20)),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (head.isNotEmpty)
                    Text(
                      head,
                      style: GoogleFonts.montserrat(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: c.ink,
                      ),
                    ),
                  const SizedBox(height: 2),
                  Text(
                    a.statement,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.inter(fontSize: 12, color: c.muted),
                  ),
                  if (a.correctAnswer.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    WfTag(
                      text:
                          '✔ ${tr(context, 'Resp. oficial', 'Official ans')}: ${a.correctAnswer}',
                      bg: c.success.withValues(alpha: 0.15),
                      fg: c.success,
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _bronzeNote() => Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
    decoration: BoxDecoration(
      color: AppColors.bronze.withValues(alpha: 0.12),
      borderRadius: BorderRadius.circular(10),
      border: Border.all(color: AppColors.bronze),
    ),
    child: Row(
      children: [
        const MedalCoin(tier: 'bronze', size: 24),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            tr(
              context,
              'Si el error se confirma, recibirás 250 medallas de bronce.',
              "If the error is confirmed, you'll receive 250 bronze medals.",
            ),
            style: GoogleFonts.inter(
              fontSize: 12,
              color: const Color(0xFF7A4A10),
            ),
          ),
        ),
      ],
    ),
  );

  Widget _form(WfColors c) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
      children: [
        _questionCard(c),
        const SizedBox(height: 14),
        Text(
          tr(context, 'Solicitar revisión', 'Request a review'),
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 4),
        Text(
          tr(
            context,
            'Si crees que la pregunta o la respuesta oficial tiene un error, cuéntanos.',
            'If you think the question or the official answer has an error, tell us.',
          ),
          style: GoogleFonts.inter(fontSize: 12, color: c.muted),
        ),
        const SizedBox(height: 8),
        for (final r in _reasons)
          Padding(
            padding: const EdgeInsets.only(top: 7),
            child: InkWell(
              borderRadius: BorderRadius.circular(10),
              onTap: () => setState(() => _reason = r.$1),
              child: Container(
                padding: const EdgeInsets.all(11),
                decoration: BoxDecoration(
                  color: _reason == r.$1
                      ? c.brand.withValues(alpha: 0.07)
                      : null,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: _reason == r.$1 ? c.brand : c.line,
                    width: 1.5,
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 16,
                      height: 16,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: _reason == r.$1 ? c.brand : c.line,
                          width: 2,
                        ),
                        color: _reason == r.$1 ? c.brand : null,
                      ),
                    ),
                    const SizedBox(width: 9),
                    Expanded(
                      child: Text(
                        tr(context, r.$2, r.$3),
                        style: GoogleFonts.inter(fontSize: 12, color: c.ink),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        const SizedBox(height: 14),
        Text(
          tr(
            context,
            'EXPLICA CON TUS PALABRAS (OPCIONAL)',
            'EXPLAIN IN YOUR OWN WORDS (OPTIONAL)',
          ),
          style: GoogleFonts.montserrat(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.6,
            color: c.muted,
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: _comment,
          maxLines: 4,
          maxLength: 1000,
          decoration: InputDecoration(
            hintText: tr(
              context,
              'ej: Según la PAES 2023, la respuesta debería ser…',
              'e.g. According to the 2023 PAES, the answer should be…',
            ),
          ),
        ),
        const SizedBox(height: 6),
        _bronzeNote(),
        if (_error != null) ...[
          const SizedBox(height: 10),
          Text(_error!, style: TextStyle(color: c.danger)),
        ],
        const SizedBox(height: 14),
        FilledButton(
          onPressed: _busy ? null : _send,
          child: _busy
              ? const SizedBox(
                  height: 20,
                  width: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: AppColors.azul,
                  ),
                )
              : Text(
                  tr(
                    context,
                    'Enviar solicitud de revisión',
                    'Send review request',
                  ),
                ),
        ),
        const SizedBox(height: 8),
        OutlinedButton(
          onPressed: () => context.pop(),
          child: Text(
            tr(context, 'Volver a la explicación', 'Back to the explanation'),
          ),
        ),
      ],
    );
  }

  Widget _sent(WfColors c) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
      children: [
        _questionCard(c),
        const SizedBox(height: 14),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.oro.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.oro, width: 1.5),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('⏳', style: TextStyle(fontSize: 22)),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      tr(context, 'Solicitud enviada', 'Request sent'),
                      style: GoogleFonts.montserrat(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFFB45309),
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      tr(
                        context,
                        'Nuestro equipo revisará la pregunta en 48 h. Si se confirma el error, recibirás 250 medallas de bronce.',
                        'Our team will review the question within 48 h. If the error is confirmed, you will receive 250 bronze medals.',
                      ),
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: const Color(0xFFB45309),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        if (_error != null) ...[
          const SizedBox(height: 10),
          Text(_error!, style: TextStyle(color: c.danger)),
        ],
        const SizedBox(height: 18),
        if (kDebugMode) ...[
          FilledButton(
            onPressed: _busy ? null : _simulateConfirm,
            child: Text(
              tr(
                context,
                '🔧 Simular: confirmar error (demo)',
                '🔧 Simulate: confirm error (demo)',
              ),
            ),
          ),
          const SizedBox(height: 8),
        ],
        OutlinedButton(
          onPressed: () => context.push('/corrections'),
          child: Text(tr(context, 'Ver mis solicitudes', 'See my requests')),
        ),
        const SizedBox(height: 8),
        OutlinedButton(
          onPressed: () => context.pop(),
          child: Text(
            tr(context, 'Volver a la explicación', 'Back to the explanation'),
          ),
        ),
      ],
    );
  }

  Widget _rewarded(WfColors c) {
    final bronze = ref.watch(profileProvider).value?.medals['bronze'];
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 40, 16, 20),
      children: [
        const Center(child: Text('🎉', style: TextStyle(fontSize: 56))),
        const SizedBox(height: 8),
        Center(
          child: Text(
            tr(context, '¡Error confirmado!', 'Error confirmed!'),
            style: GoogleFonts.montserrat(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: c.success,
            ),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          tr(
            context,
            'El equipo revisó la pregunta y confirmó el error. Has recibido 250 medallas de bronce.',
            'The team reviewed the question and confirmed the error. You received 250 bronze medals.',
          ),
          textAlign: TextAlign.center,
          style: GoogleFonts.inter(fontSize: 13, color: c.muted),
        ),
        const SizedBox(height: 18),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const MedalCoin(tier: 'bronze', size: 40),
            const SizedBox(width: 8),
            Text(
              '+250',
              style: GoogleFonts.montserrat(
                fontSize: 32,
                fontWeight: FontWeight.w800,
                color: AppColors.bronze,
              ),
            ),
          ],
        ),
        if (bronze != null) ...[
          const SizedBox(height: 10),
          Center(
            child: Text(
              '${tr(context, 'Total bronce', 'Total bronze')}: $bronze',
              style: GoogleFonts.inter(fontSize: 13, color: c.muted),
            ),
          ),
        ],
        const SizedBox(height: 24),
        FilledButton(
          onPressed: () => context.go('/home'),
          child: Text(tr(context, 'Volver al inicio', 'Back to home')),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = WfColors.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(
          _stage == _Stage.form
              ? tr(context, 'Solicitar revisión', 'Request a review')
              : tr(context, 'Recorrección', 'Correction'),
        ),
      ),
      body: switch (_stage) {
        _Stage.form => _form(c),
        _Stage.sent => _sent(c),
        _Stage.rewarded => _rewarded(c),
      },
    );
  }
}
