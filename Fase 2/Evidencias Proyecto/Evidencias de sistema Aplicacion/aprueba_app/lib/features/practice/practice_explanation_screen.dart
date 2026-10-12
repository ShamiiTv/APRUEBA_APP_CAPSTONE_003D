import 'package:flutter/material.dart';

import '../../core/utils/tier_names.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/l10n/l10n.dart';
import '../../core/theme/wf_colors.dart';
import '../../data/practice_models.dart';
import 'practice_providers.dart';
import 'practice_repository.dart';

/// "Explicación detallada": se pide al API (GET /questions/{id}/explanation).
class PracticeExplanationScreen extends ConsumerStatefulWidget {
  const PracticeExplanationScreen({super.key, required this.args});

  final ExplanationArgs args;

  @override
  ConsumerState<PracticeExplanationScreen> createState() =>
      _PracticeExplanationScreenState();
}

class _PracticeExplanationScreenState
    extends ConsumerState<PracticeExplanationScreen> {
  late Future<ExplanationData> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<ExplanationData> _load() => ref
      .read(practiceRepositoryProvider)
      .fetchExplanation(widget.args.questionId);

  Widget _card(
    WfColors c,
    String title,
    String body, {
    Color? tint,
    Color? border,
  }) {
    return Padding(
      padding: const EdgeInsets.only(top: 11),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(
          color: tint ?? Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: border ?? c.line, width: 1.5),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: GoogleFonts.inter(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: c.ink,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              body,
              style: GoogleFonts.inter(
                fontSize: 12,
                height: 1.45,
                color: c.muted,
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = WfColors.of(context);
    final tt = Theme.of(context).textTheme;
    final args = widget.args;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          tr(context, 'Explicación detallada', 'Detailed explanation'),
        ),
      ),
      body: FutureBuilder<ExplanationData>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError) {
            final msg = snap.error is PracticeException
                ? (snap.error as PracticeException).message
                : tr(
                    context,
                    'No se pudo cargar la explicación.',
                    'Could not load the explanation.',
                  );
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      msg,
                      textAlign: TextAlign.center,
                      style: TextStyle(color: c.danger),
                    ),
                    const SizedBox(height: 14),
                    FilledButton(
                      onPressed: () => setState(() => _future = _load()),
                      child: Text(tr(context, 'Reintentar', 'Retry')),
                    ),
                  ],
                ),
              ),
            );
          }

          final d = snap.data!;
          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
            children: [
              Row(
                children: [
                  const Text('📖', style: TextStyle(fontSize: 26)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          d.title.isEmpty
                              ? tr(
                                  context,
                                  'Cómo se llega a la respuesta',
                                  'How to get to the answer',
                                )
                              : d.title,
                          style: tt.headlineSmall,
                        ),
                        Text(
                          d.subject.isEmpty
                              ? tr(context, 'Paso a paso', 'Step by step')
                              : '${tr(context, 'Paso a paso', 'Step by step')} · ${testName(context, d.subject, d.subject)}',
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            color: c.muted,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 11),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(13),
                  child: Text(
                    args.statement,
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: c.ink,
                    ),
                  ),
                ),
              ),
              for (final s in d.steps)
                _card(c, stepLabel(context, s.label), s.body),
              if (d.verification.isNotEmpty)
                _card(
                  c,
                  '✅ ${tr(context, 'Verificación', 'Check')}',
                  d.verification,
                  tint: c.success.withValues(alpha: 0.08),
                  border: c.success,
                ),
              if (d.keyConcept.isNotEmpty)
                _card(
                  c,
                  '💡 ${tr(context, 'Concepto clave', 'Key concept')}',
                  d.keyConcept,
                  tint: c.brand.withValues(alpha: 0.07),
                  border: c.brand,
                ),
              const SizedBox(height: 16),
              OutlinedButton(
                onPressed: () => context.go('/practice'),
                child: Text(
                  '🎯 ${tr(context, 'Practicar similares', 'Practice similar')}',
                ),
              ),
              const Divider(height: 28),
              OutlinedButton(
                style: OutlinedButton.styleFrom(
                  foregroundColor: c.brand,
                  side: BorderSide(color: c.brand, width: 1.5),
                ),
                onPressed: () => context.push('/practice/skill', extra: args),
                child: Text(
                  '🧠 ${tr(context, '¿Qué necesito saber para esto?', 'What do I need to know for this?')}',
                ),
              ),
              const SizedBox(height: 8),
              OutlinedButton(
                style: OutlinedButton.styleFrom(
                  foregroundColor: c.danger,
                  side: BorderSide(color: c.danger, width: 1.5),
                ),
                onPressed: () =>
                    context.push('/practice/correction', extra: args),
                child: Text(
                  '⚑ ${tr(context, 'Solicitar recorrección', 'Request a correction')}',
                ),
              ),
              const SizedBox(height: 8),
              FilledButton(
                onPressed: () => context.pop(),
                child: Text(
                  tr(context, 'Volver al resultado', 'Back to result'),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
