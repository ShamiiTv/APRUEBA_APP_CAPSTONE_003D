import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/l10n/l10n.dart';
import '../../core/network/api_error.dart';
import '../../core/theme/wf_colors.dart';
import '../../core/utils/test_colors.dart';
import '../../core/utils/tier_names.dart';
import '../../core/widgets/avatar_circle.dart';
import '../../core/widgets/content_skeleton.dart';
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
  static const _amarillo = Color(0xFFF5AF41);
  String _query = '';
  String _testId = 'all';

  Widget _chip(String label, String id, WfColors c) {
    final on = _testId == id;
    final dot = id == 'all' ? null : testDotColor(id, label, c.muted);
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: InkWell(
        borderRadius: BorderRadius.circular(22),
        onTap: () => setState(() => _testId = id),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
          decoration: BoxDecoration(
            color: on ? c.brand : c.chip,
            borderRadius: BorderRadius.circular(22),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (dot != null) ...[
                Container(
                  width: 9,
                  height: 9,
                  decoration: BoxDecoration(
                    color: dot,
                    shape: BoxShape.circle,
                    border: on
                        ? Border.all(color: Colors.white, width: 1.5)
                        : null,
                  ),
                ),
                const SizedBox(width: 7),
              ],
              Text(
                label,
                style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: on ? Colors.white : c.ink,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _gapCard(WfColors c) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Theme.of(context).brightness == Brightness.dark
            ? const Color(0xFF3B3223)
            : const Color(0xFFFFF6E5),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _amarillo.withValues(alpha: 0.6)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text('🎯', style: TextStyle(fontSize: 28)),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      tr(context, 'Análisis de falencias', 'Gap analysis'),
                      style: GoogleFonts.montserrat(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF1A365D),
                      ),
                    ),
                    Text(
                      tr(
                        context,
                        'Detecta tus áreas débiles desde tu práctica PAES',
                        'Find your weak areas from your PAES practice',
                      ),
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: const Color(0xFF475569),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: _amarillo,
                foregroundColor: const Color(0xFF1A365D),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
                textStyle: GoogleFonts.montserrat(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                ),
              ),
              onPressed: () {
                final allowed =
                    ref.read(profileProvider).value?.hasTutorAccess == true;
                context.push(allowed ? '/tutors/analysis' : '/premium/tutors');
              },
              child: Text(
                tr(context, 'Generar mi análisis →', 'Generate my analysis →'),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _card(BuildContext context, Tutor t) {
    final c = WfColors.of(context);
    final sub = [
      if (t.subjectLabel.isNotEmpty) t.subjectLabel,
      if (t.mode != null) t.mode!,
    ].join(' · ');

    return Container(
      margin: const EdgeInsets.only(top: 11),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: c.bg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: t.color.withValues(alpha: 0.5), width: 1.2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AvatarCircle(name: t.name, color: t.color, size: 48),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            t.name,
                            style: GoogleFonts.montserrat(
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                              color: c.ink,
                            ),
                          ),
                        ),
                        if (t.verified) ...[
                          const SizedBox(width: 6),
                          WfTag(
                            text: tr(context, '✔ Verificado', '✔ Verified'),
                            bg: const Color(0x2110B981),
                            fg: const Color(0xFF059669),
                          ),
                        ],
                      ],
                    ),
                    if (sub.isNotEmpty)
                      Text(
                        sub,
                        style: GoogleFonts.inter(fontSize: 12, color: c.muted),
                      ),
                    if (t.specialty != null)
                      Text(
                        t.specialty!,
                        style: GoogleFonts.inter(fontSize: 12, color: c.muted),
                      ),
                    if (t.rating != null) ...[
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          TutorStars(rating: t.rating!, size: 13),
                          const SizedBox(width: 6),
                          Text(
                            t.rating!.toStringAsFixed(1),
                            style: GoogleFonts.montserrat(
                              fontSize: 12,
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
          const SizedBox(height: 12),
          Row(
            children: [
              if (t.priceLabel != null)
                Flexible(
                  child: Text(
                    t.priceLabel!,
                    style: GoogleFonts.montserrat(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      color: c.ink,
                    ),
                  ),
                ),
              const Spacer(),
              FilledButton(
                style: FilledButton.styleFrom(
                  minimumSize: const Size(0, 42),
                  backgroundColor: c.brand,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                  textStyle: GoogleFonts.montserrat(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                onPressed: () => context.push('/tutors/profile', extra: t),
                child: Text(tr(context, 'Ver perfil ›', 'View profile ›')),
              ),
            ],
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = WfColors.of(context);
    final tt = Theme.of(context).textTheme;
    final tutorsAsync = ref.watch(tutorsProvider);
    final tests = ref.watch(testsProvider).value ?? const <PracticeTest>[];

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
                  text: 'Premium',
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
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(13),
              decoration: BoxDecoration(
                color: c.brand.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: c.line),
              ),
              child: Text(
                tr(
                  context,
                  'Encuentra apoyo en las materias que quieres reforzar.',
                  'Get support in the subjects you want to strengthen.',
                ),
                style: GoogleFonts.inter(
                  fontSize: 12,
                  color: c.ink,
                  height: 1.5,
                ),
              ),
            ),
            const SizedBox(height: 14),
            _gapCard(c),
            const SizedBox(height: 16),
            Text(
              tr(context, 'PROFESORES DESTACADOS', 'FEATURED TEACHERS'),
              style: GoogleFonts.montserrat(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.8,
                color: c.muted,
              ),
            ),
            tutorsAsync.when(
              loading: () =>
                  const ContentSkeleton(kind: 'tutors', inline: true),
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
}
