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
import 'practice_providers.dart';
import 'practice_repository.dart';

/// "¿Qué necesito saber para esto?" (GET /questions/{id}/skill).
class SkillScreen extends ConsumerStatefulWidget {
  const SkillScreen({super.key, required this.args});

  final ExplanationArgs args;

  @override
  ConsumerState<SkillScreen> createState() => _SkillScreenState();
}

class _SkillScreenState extends ConsumerState<SkillScreen> {
  late Future<SkillInfo> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<SkillInfo> _load() =>
      ref.read(practiceRepositoryProvider).fetchSkill(widget.args.questionId);

  Widget _label(WfColors c, String text) => Padding(
    padding: const EdgeInsets.only(top: 16, bottom: 6),
    child: Text(
      text.toUpperCase(),
      style: GoogleFonts.montserrat(
        fontSize: 11,
        fontWeight: FontWeight.w700,
        letterSpacing: 0.6,
        color: c.muted,
      ),
    ),
  );

  Widget _chipOnBrand(String text, {Color? bg, Color? fg}) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(
      color: bg ?? Colors.white.withValues(alpha: 0.18),
      borderRadius: BorderRadius.circular(6),
    ),
    child: Text(
      text,
      style: GoogleFonts.montserrat(
        fontSize: 10,
        fontWeight: FontWeight.w700,
        color: fg ?? Colors.white,
      ),
    ),
  );

  Widget _prereq(WfColors c, SkillPrerequisite p) {
    final done = p.status == 'done';
    final active = p.status == 'active';
    final tone = done ? c.success : (active ? AppColors.oro : c.muted);
    final tag = done
        ? '✔ ${tr(context, 'Dom.', 'Done')}'
        : active
        ? tr(context, 'En curso', 'Active')
        : '🔒 ${tr(context, 'Bloq.', 'Locked')}';
    return Container(
      margin: const EdgeInsets.only(top: 6),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: tone.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(color: tone, shape: BoxShape.circle),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              p.name,
              style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: c.ink,
              ),
            ),
          ),
          Text(tag, style: GoogleFonts.inter(fontSize: 10, color: c.muted)),
        ],
      ),
    );
  }

  Widget _resource(WfColors c, SkillResource r) {
    final icon = r.type == 'video' ? '▶️' : (r.type == 'pdf' ? '📄' : '🧩');
    final meta = [
      if (r.duration != null) r.duration!,
      if (r.source != null) r.source!,
    ].join(' · ');
    return Padding(
      padding: const EdgeInsets.only(top: 6),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(11),
          child: Row(
            children: [
              Text(icon, style: const TextStyle(fontSize: 20)),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      r.title,
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: c.ink,
                      ),
                    ),
                    if (meta.isNotEmpty)
                      Text(
                        meta,
                        style: GoogleFonts.inter(fontSize: 10, color: c.muted),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = WfColors.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(tr(context, 'Habilidad evaluada', 'Skill assessed')),
      ),
      body: FutureBuilder<SkillInfo>(
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
                    'No se pudo cargar la habilidad.',
                    'Could not load the skill.',
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

          final s = snap.data!;
          final statusText = switch (s.status) {
            'mastered' => tr(context, 'Dominada', 'Mastered'),
            'in_progress' => tr(context, 'En progreso', 'In progress'),
            _ => tr(context, 'Sin empezar', 'Not started'),
          };
          final level = difficultyName(context, widget.args.difficulty);

          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
            children: [
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: c.brand,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      tr(
                        context,
                        'COMPETENCIA ESPECÍFICA QUE MIDE ESTA PREGUNTA',
                        'SPECIFIC SKILL THIS QUESTION MEASURES',
                      ),
                      style: GoogleFonts.montserrat(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.8,
                        color: Colors.white70,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      s.name,
                      style: GoogleFonts.montserrat(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        if (widget.args.axis.isNotEmpty)
                          _chipOnBrand(axisName(context, widget.args.axis)),
                        if (widget.args.testLabel.isNotEmpty)
                          _chipOnBrand(widget.args.testLabel),
                        _chipOnBrand(
                          '${level ?? ''}${level != null ? ' · ' : ''}${tr(context, 'Nivel', 'Level')} ${s.level}/${s.maxLevel}',
                          bg: AppColors.oro.withValues(alpha: 0.3),
                          fg: AppColors.oro,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              _label(c, tr(context, 'Tu estado actual', 'Your current status')),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(11),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              tr(context, 'Tu dominio', 'Your mastery'),
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: c.ink,
                              ),
                            ),
                          ),
                          Text(
                            '${s.percent}%',
                            style: GoogleFonts.montserrat(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                              color: c.brand,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      WfBar(value: s.percent / 100),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              tr(
                                context,
                                '${s.correct} de ${s.total} correctas',
                                '${s.correct} of ${s.total} correct',
                              ),
                              style: GoogleFonts.inter(
                                fontSize: 11,
                                color: c.muted,
                              ),
                            ),
                          ),
                          WfTag(text: statusText),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              _label(
                c,
                tr(
                  context,
                  'Conceptos previos necesarios',
                  'Prerequisite concepts',
                ),
              ),
              if (s.prerequisites.isEmpty)
                Text(
                  tr(
                    context,
                    'Aún no hay un árbol de conceptos cargado para esta habilidad.',
                    'No prerequisite tree has been loaded for this skill yet.',
                  ),
                  style: GoogleFonts.inter(fontSize: 12, color: c.muted),
                )
              else
                for (final p in s.prerequisites) _prereq(c, p),
              _label(
                c,
                tr(
                  context,
                  'Cómo desarrollar esta habilidad',
                  'How to build this skill',
                ),
              ),
              if (s.resources.isEmpty)
                Text(
                  tr(
                    context,
                    'Pronto habrá videos, fichas y módulos recomendados.',
                    'Recommended videos, worksheets and modules are coming soon.',
                  ),
                  style: GoogleFonts.inter(fontSize: 12, color: c.muted),
                )
              else
                for (final r in s.resources) _resource(c, r),
              const SizedBox(height: 18),
              OutlinedButton(
                onPressed: () => context.go('/practice'),
                child: Text(
                  '🎯 ${tr(context, 'Practicar preguntas similares', 'Practice similar questions')}',
                ),
              ),
              const SizedBox(height: 8),
              FilledButton(
                onPressed: () => context.pop(),
                child: Text(
                  tr(
                    context,
                    'Volver a la explicación',
                    'Back to the explanation',
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
