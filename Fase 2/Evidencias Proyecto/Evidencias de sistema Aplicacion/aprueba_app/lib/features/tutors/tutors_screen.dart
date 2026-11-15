import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/l10n/l10n.dart';
import '../../core/theme/wf_colors.dart';
import '../../core/utils/test_colors.dart';
import '../../core/widgets/avatar_circle.dart';
import '../../core/widgets/content_skeleton.dart';
import '../../core/widgets/wf_widgets.dart';
import '../../data/social_models.dart';
import 'tutor_widgets.dart';
import 'tutors_providers.dart';
import '../auth/auth_providers.dart';

class TutorsScreen extends ConsumerStatefulWidget {
  const TutorsScreen({super.key});
  @override
  ConsumerState<TutorsScreen> createState() => _TutorsState();
}

class _TutorsState extends ConsumerState<TutorsScreen> {
  static const _amarillo = Color(0xFFF5AF41);
  String subject = 'all';

  Widget _filter(String id, String label) {
    final c = WfColors.of(context);
    final on = subject == id;
    final dot = id == 'all' ? null : testDotColor(id, id, c.muted);
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: InkWell(
        borderRadius: BorderRadius.circular(22),
        onTap: () => setState(() => subject = id),
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
                    border: on ? Border.all(color: Colors.white, width: 1.5) : null,
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

  Widget _gapCard() {
    final c = WfColors.of(context);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF6E5),
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
                        color: c.ink,
                      ),
                    ),
                    Text(
                      tr(
                        context,
                        'Detecta tus áreas débiles desde tu práctica PAES',
                        'Find your weak areas from your PAES practice',
                      ),
                      style: GoogleFonts.inter(fontSize: 12, color: c.muted),
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
                final plan = ref.read(profileProvider).value?.plan;
                context.push(plan == 'all' ? '/tutors/analysis' : '/premium/tutors');
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

  Widget _tutorCard(Tutor t) {
    final c = WfColors.of(context);
    final sub = [
      if (t.subjectLabel.isNotEmpty) t.subjectLabel,
      if (t.mode != null) t.mode!,
    ].join(' · ');
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: c.chip,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: c.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AvatarCircle(name: t.name, color: t.color, size: 50),
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
                              fontSize: 16,
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
                      Text(sub, style: GoogleFonts.inter(fontSize: 12, color: c.muted)),
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
                              style: GoogleFonts.inter(fontSize: 11, color: c.muted),
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
                Text(
                  t.priceLabel!,
                  style: GoogleFonts.montserrat(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: c.ink,
                  ),
                ),
              const Spacer(),
              FilledButton(
                style: FilledButton.styleFrom(
                  minimumSize: const Size(0, 44),
                  backgroundColor: c.brand,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                  textStyle: GoogleFonts.montserrat(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                onPressed: () => context.push('/tutors/profile', extra: t),
                child: Text(tr(context, 'Ver perfil', 'View profile')),
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
    final filters = <(String, String)>[
      ('all', tr(context, 'Todas', 'All')),
      ('lectora', tr(context, 'Comp. Lectora', 'Reading')),
      ('m1', 'Matemática M1'),
      ('m2', 'Matemática M2'),
      ('cien', tr(context, 'Ciencias', 'Science')),
      ('hist', tr(context, 'Historia', 'History')),
    ];

    return Scaffold(
      appBar: AppBar(title: Text(tr(context, 'Tutores', 'Tutors'))),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          Text(
            tr(
              context,
              'Perfiles ficticios de demostración. No se contacta a un profesor real ni se cobra una sesión.',
              'Fictional demo profiles. No real teacher is contacted or charged.',
            ),
            style: GoogleFonts.inter(fontSize: 11, color: c.muted),
          ),
          const SizedBox(height: 12),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [for (final f in filters) _filter(f.$1, f.$2)],
            ),
          ),
          const SizedBox(height: 14),
          _gapCard(),
          const SizedBox(height: 18),
          Text(
            tr(context, 'PROFESORES DESTACADOS', 'FEATURED TEACHERS'),
            style: GoogleFonts.montserrat(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.8,
              color: c.muted,
            ),
          ),
          const SizedBox(height: 10),
          ref.watch(tutorsProvider).when(
                loading: () => const ContentSkeleton(kind: 'tutors', inline: true),
                error: (e, s) => TextButton(
                  onPressed: () => ref.invalidate(tutorsProvider),
                  child: Text(tr(context, 'Reintentar', 'Retry')),
                ),
                data: (tutors) => Column(
                  children: [
                    for (final t in tutors.where(
                      (t) => subject == 'all' || t.subjectTestId == subject,
                    ))
                      _tutorCard(t),
                  ],
                ),
              ),
        ],
      ),
    );
  }
}