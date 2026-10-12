import 'package:flutter/material.dart';

import '../../core/utils/tier_names.dart';
import '../../core/l10n/l10n.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/theme/wf_colors.dart';
import '../../core/widgets/wf_widgets.dart';
import '../../data/practice_models.dart';
import '../auth/auth_providers.dart';
import '../practice/practice_providers.dart';

class GapAnalysisScreen extends ConsumerWidget {
  const GapAnalysisScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = WfColors.of(context);
    final progress =
        ref.watch(progressProvider).value ?? const <String, ProgressItem>{};
    final tests = ref.watch(testsProvider).value ?? const <PracticeTest>[];
    final profile = ref.watch(profileProvider).value;
    final chosen = profile?.selectedTests ?? const <String>[];

    final rows =
        <({PracticeTest test, ProgressItem? item})>[
          for (final t in tests)
            if (chosen.isEmpty || chosen.contains(t.id))
              (test: t, item: progress[t.id]),
        ]..sort((a, b) {
          final pa = (a.item == null || a.item!.answered == 0)
              ? 101
              : a.item!.percent;
          final pb = (b.item == null || b.item!.answered == 0)
              ? 101
              : b.item!.percent;
          return pa.compareTo(pb);
        });

    final total = progress.values.fold<int>(0, (s, p) => s + p.answered);

    return Scaffold(
      appBar: AppBar(
        title: Text(tr(context, 'Análisis de falencias', 'Weakness analysis')),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
        children: [
          const Align(
            alignment: Alignment.centerLeft,
            child: WfTag(
              text: '⭐ Premium',
              bg: Color(0x2EF5B041),
              fg: Color(0xFFB45309),
            ),
          ),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(13),
            decoration: BoxDecoration(
              color: c.brand.withValues(alpha: 0.05),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: c.brand, width: 1.5),
            ),
            child: Row(
              children: [
                const Text('📊', style: TextStyle(fontSize: 20)),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        tr(
                          context,
                          'Tu diagnóstico PAES',
                          'Your PAES diagnosis',
                        ),
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Text(
                        tr(
                          context,
                          'Basado en $total ejercicios resueltos en Aprueba',
                          'Based on $total exercises solved in Aprueba',
                        ),
                        style: GoogleFonts.inter(fontSize: 11, color: c.muted),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            tr(
              context,
              'Generado desde tu desempeño. Ordenado de mayor a menor necesidad.',
              'Generated from your performance. Sorted from highest to lowest need.',
            ),
            style: GoogleFonts.inter(fontSize: 11, color: c.muted),
          ),
          if (total == 0)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 30),
              child: Text(
                tr(
                  context,
                  'Responde algunas preguntas en Práctica para generar tu análisis.',
                  'Answer some questions in Practice to generate your analysis.',
                ),
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(fontSize: 13, color: c.muted),
              ),
            ),
          for (final r in rows) _row(context, r.test, r.item),
        ],
      ),
    );
  }

  Widget _row(BuildContext context, PracticeTest t, ProgressItem? item) {
    final c = WfColors.of(context);
    final has = item != null && item.answered > 0;
    final pct = has ? item.percent : 0;

    Color bg;
    Color fg;
    if (!has) {
      bg = c.chip;
      fg = c.muted;
    } else if (pct < 55) {
      bg = const Color(0x21EF4444);
      fg = const Color(0xFFDC2626);
    } else if (pct < 70) {
      bg = const Color(0x2EF5B041);
      fg = const Color(0xFFB45309);
    } else {
      bg = const Color(0x2110B981);
      fg = const Color(0xFF059669);
    }

    return Padding(
      padding: const EdgeInsets.only(top: 11),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(13),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      testName(context, t.id, t.label),
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  WfTag(
                    text: has
                        ? tr(context, '$pct% dominio', '$pct% mastery')
                        : tr(context, 'Sin datos aún', 'No data yet'),
                    bg: bg,
                    fg: fg,
                  ),
                ],
              ),
              const SizedBox(height: 8),
              WfBar(value: pct / 100, color: t.color, height: 7),
              const SizedBox(height: 6),
              Text(
                has
                    ? tr(
                        context,
                        '${item.correct} correctas de ${item.answered} respondidas',
                        '${item.correct} correct out of ${item.answered} answered',
                      )
                    : tr(
                        context,
                        'Aún no respondes preguntas de esta prueba.',
                        'You have not answered questions from this test yet.',
                      ),
                style: GoogleFonts.inter(fontSize: 11, color: c.muted),
              ),
              if (has && pct < 70) ...[
                const SizedBox(height: 10),
                OutlinedButton(
                  onPressed: () => context.go('/tutors'),
                  child: Text(
                    tr(
                      context,
                      'Ver tutores recomendados →',
                      'See recommended tutors →',
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
