import 'package:flutter/material.dart';

import '../../core/utils/tier_names.dart';
import '../../core/l10n/l10n.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/network/api_error.dart';
import '../../core/theme/wf_colors.dart';
import '../../core/widgets/avatar_circle.dart';
import '../../core/widgets/wf_widgets.dart';
import '../../data/practice_models.dart';
import '../../data/social_models.dart';
import '../auth/auth_providers.dart';
import '../practice/practice_providers.dart';
import 'tutor_widgets.dart';
import 'tutors_providers.dart';

class TutorsScreen extends ConsumerStatefulWidget {
  const TutorsScreen({super.key});

  @override
  ConsumerState<TutorsScreen> createState() => _TutorsScreenState();
}

class _TutorsScreenState extends ConsumerState<TutorsScreen> {
  String _query = '';
  String _testId = 'all';

  Widget _chip(String label, String id, WfColors c) {
    final on = _testId == id;
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: () => setState(() => _testId = id),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 6),
          decoration: BoxDecoration(
            color: on ? c.brand : c.chip,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: on ? Colors.white : c.ink,
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = WfColors.of(context);
    final tt = Theme.of(context).textTheme;
    final tutorsAsync = ref.watch(tutorsProvider);
    final tests = ref.watch(testsProvider).value ?? const <PracticeTest>[];
    final plan = ref.watch(profileProvider).value?.plan ?? 'free';
    final isFree = plan == 'free';

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
          children: [
            Row(
              children: [
                Text(tr(context, 'Tutores', 'Tutors'), style: tt.headlineSmall),
                const Spacer(),
                const WfTag(
                  text: '⭐ Premium',
                  bg: Color(0x2EF5B041),
                  fg: Color(0xFFB45309),
                ),
              ],
            ),
            const SizedBox(height: 10),
            TextField(
              onChanged: (v) => setState(() => _query = v.trim().toLowerCase()),
              decoration: InputDecoration(
                hintText: tr(
                  context,
                  '🔍 Buscar profesor o asignatura…',
                  '🔍 Search teacher or subject…',
                ),
              ),
            ),
            const SizedBox(height: 8),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _chip(tr(context, 'Todos', 'All'), 'all', c),
                  for (final t in tests)
                    _chip(testName(context, t.id, t.label), t.id, c),
                ],
              ),
            ),
            if (isFree) ...[
              const SizedBox(height: 10),
              InkWell(
                borderRadius: BorderRadius.circular(14),
                onTap: () => context.push('/plans'),
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: c.brand.withValues(alpha: 0.05),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: c.brand, width: 1.5),
                  ),
                  child: Row(
                    children: [
                      const Text('🔓', style: TextStyle(fontSize: 18)),
                      const SizedBox(width: 9),
                      Expanded(
                        child: Text(
                          tr(
                            context,
                            'Contactar tutores y el análisis requieren Premium',
                            'Contacting tutors and the analysis require Premium',
                          ),
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      WfTag(
                        text: tr(context, 'Mejorar ›', 'Upgrade ›'),
                        bg: Color(0x2110B981),
                        fg: Color(0xFF059669),
                      ),
                    ],
                  ),
                ),
              ),
            ],
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(13),
              decoration: BoxDecoration(
                color: const Color(0x1FF5B041),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFF5B041), width: 1.5),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Text('🎯', style: TextStyle(fontSize: 22)),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              tr(
                                context,
                                'Análisis de falencias',
                                'Weakness analysis',
                              ),
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            Text(
                              tr(
                                context,
                                'Detecta tus áreas débiles desde tu práctica PAES',
                                'Find your weak areas from your PAES practice',
                              ),
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
                  const SizedBox(height: 10),
                  FilledButton(
                    onPressed: () =>
                        context.push(isFree ? '/plans' : '/tutors/analysis'),
                    child: Text(
                      tr(
                        context,
                        'Generar mi análisis →',
                        'Generate my analysis →',
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Text(
              tr(context, 'Profesores destacados', 'Featured teachers'),
              style: tt.headlineSmall?.copyWith(fontSize: 15),
            ),
            tutorsAsync.when(
              loading: () => const Padding(
                padding: EdgeInsets.all(28),
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (e, _) => Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Text(
                      e is ApiFailure
                          ? e.message
                          : tr(
                              context,
                              'No se pudieron cargar los tutores.',
                              'Could not load tutors.',
                            ),
                      textAlign: TextAlign.center,
                      style: TextStyle(color: c.danger),
                    ),
                    const SizedBox(height: 10),
                    FilledButton(
                      onPressed: () => ref.invalidate(tutorsProvider),
                      child: Text(tr(context, 'Reintentar', 'Retry')),
                    ),
                  ],
                ),
              ),
              data: (all) {
                final list = all.where((t) {
                  final byTest = _testId == 'all' || t.subjectTestId == _testId;
                  final byText =
                      _query.isEmpty ||
                      t.name.toLowerCase().contains(_query) ||
                      t.subjectLabel.toLowerCase().contains(_query) ||
                      (t.specialty ?? '').toLowerCase().contains(_query);
                  return byTest && byText;
                }).toList();

                if (list.isEmpty) {
                  return Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text(
                      all.isEmpty
                          ? tr(
                              context,
                              'Todavía no hay tutores disponibles.',
                              'There are no tutors available yet.',
                            )
                          : tr(
                              context,
                              'No hay tutores que coincidan con tu búsqueda.',
                              'No tutors match your search.',
                            ),
                      textAlign: TextAlign.center,
                      style: GoogleFonts.inter(fontSize: 13, color: c.muted),
                    ),
                  );
                }
                return Column(
                  children: [for (final t in list) _card(context, t)],
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _card(BuildContext context, Tutor t) {
    final c = WfColors.of(context);
    final sub = [
      if (t.subjectLabel.isNotEmpty)
        testName(context, t.subjectLabel, t.subjectLabel),
      if (t.mode != null) t.mode!,
    ].join(' · ');
    final detail = [
      if (t.specialty != null) t.specialty!,
      if (t.university != null) t.university!,
    ].join(' · ');

    return Padding(
      padding: const EdgeInsets.only(top: 11),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () => context.push('/tutors/profile', extra: t),
        child: Ink(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: c.soft,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: c.line, width: 1.5),
          ),
          child: Column(
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  AvatarCircle(name: t.name, color: t.color, size: 44),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                t.name,
                                style: GoogleFonts.montserrat(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                            if (t.verified)
                              WfTag(
                                text: tr(context, '✔ Verificado', '✔ Verified'),
                                bg: Color(0x2110B981),
                                fg: Color(0xFF059669),
                              ),
                          ],
                        ),
                        if (sub.isNotEmpty)
                          Text(
                            sub,
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              color: c.muted,
                            ),
                          ),
                        if (detail.isNotEmpty)
                          Text(
                            detail,
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              color: c.muted,
                            ),
                          ),
                        if (t.rating != null) ...[
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              TutorStars(rating: t.rating!),
                              const SizedBox(width: 6),
                              Text(
                                t.rating!.toStringAsFixed(1),
                                style: GoogleFonts.montserrat(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              if (t.reviewsCount != null)
                                Text(
                                  ' (${t.reviewsCount})',
                                  style: GoogleFonts.inter(
                                    fontSize: 11,
                                    color: c.muted,
                                  ),
                                ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  if (t.priceLabel != null)
                    Text(
                      t.priceLabel!,
                      style: GoogleFonts.montserrat(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        color: c.brand,
                      ),
                    ),
                  const Spacer(),
                  WfTag(
                    text: tr(context, 'Ver perfil ›', 'View profile ›'),
                    bg: c.brand,
                    fg: Colors.white,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
