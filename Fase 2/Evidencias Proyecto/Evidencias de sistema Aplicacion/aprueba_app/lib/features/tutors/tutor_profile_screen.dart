import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/l10n/l10n.dart';
import '../../core/theme/wf_colors.dart';
import '../../core/widgets/avatar_circle.dart';
import '../../core/widgets/wf_widgets.dart';
import '../../data/social_models.dart';
import 'tutor_widgets.dart';
import '../auth/auth_providers.dart';

class TutorProfileScreen extends ConsumerWidget {
  const TutorProfileScreen({super.key, required this.tutor});

  final Tutor tutor;

  Widget _label(BuildContext context, String text) => Padding(
        padding: const EdgeInsets.only(top: 20, bottom: 8),
        child: Text(
          text,
          style: GoogleFonts.montserrat(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.8,
            color: WfColors.of(context).muted,
          ),
        ),
      );

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = WfColors.of(context);
    final t = tutor;
    final sub = [
      if (t.subjectLabel.isNotEmpty) t.subjectLabel,
      if (t.mode != null) t.mode!,
    ].join(' · ');
    final firstName = t.name.split(' ').first;
    final criteriaLabels = <String, String>{
      'didactics': tr(context, 'Didáctica (claridad)', 'Teaching clarity'),
      'punctuality': tr(context, 'Puntualidad', 'Punctuality'),
      'mastery': tr(context, 'Dominio del tema', 'Subject mastery'),
    };

    return Scaffold(
      appBar: AppBar(
        title: Text(tr(context, 'Perfil del profesor', 'Teacher profile')),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AvatarCircle(name: t.name, color: t.color, size: 64),
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
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
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
                            style: GoogleFonts.montserrat(fontSize: 12, fontWeight: FontWeight.w700),
                          ),
                          if (t.reviewsCount != null)
                            Text(
                              tr(context, ' (${t.reviewsCount} reseñas)', ' (${t.reviewsCount} reviews)'),
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
          if (t.priceLabel != null || t.experienceYears != null) ...[
            const SizedBox(height: 14),
            Row(
              children: [
                if (t.priceLabel != null)
                  Text(
                    t.priceLabel!,
                    style: GoogleFonts.montserrat(fontSize: 22, fontWeight: FontWeight.w800, color: c.ink),
                  ),
                const Spacer(),
                if (t.experienceYears != null)
                  WfTag(
                    text: tr(context, '🎓 ${t.experienceYears} años exp.', '🎓 ${t.experienceYears} yrs exp.'),
                  ),
              ],
            ),
          ],
          if (t.bio != null) ...[
            const SizedBox(height: 14),
            Text(t.bio!, style: GoogleFonts.inter(fontSize: 13, color: c.muted, height: 1.5)),
          ],
          if (t.criteria.isNotEmpty) ...[
            _label(context, tr(context, 'VALORACIÓN POR CRITERIO', 'RATING BY CRITERION')),
            for (final e in criteriaLabels.entries)
              if (t.criteria[e.key] != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(e.value, style: GoogleFonts.inter(fontSize: 13, color: c.muted)),
                      ),
                      TutorStars(rating: t.criteria[e.key]!, size: 13),
                      const SizedBox(width: 10),
                      SizedBox(
                        width: 30,
                        child: Text(
                          t.criteria[e.key]!.toStringAsFixed(1),
                          textAlign: TextAlign.right,
                          style: GoogleFonts.montserrat(fontSize: 13, fontWeight: FontWeight.w800),
                        ),
                      ),
                    ],
                  ),
                ),
          ],
          if (t.reviewText != null) ...[
            _label(context, tr(context, 'RESEÑAS', 'REVIEWS')),
            Container(
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
                    children: [
                      Text(
                        t.reviewAuthor ?? '',
                        style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700),
                      ),
                      const Spacer(),
                      const TutorStars(rating: 5, size: 13),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '"${t.reviewText}"',
                    style: GoogleFonts.inter(fontSize: 13, color: c.muted, height: 1.4),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 24),
          SizedBox(
            height: 54,
            child: FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFFF5AF41),
                foregroundColor: const Color(0xFF1A365D),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                textStyle: GoogleFonts.montserrat(fontSize: 16, fontWeight: FontWeight.w800),
              ),
              onPressed: () {
                final plan = ref.read(profileProvider).value?.plan;
                context.push(plan == 'all' ? '/tutors/contact' : '/premium/tutors', extra: t);
              },
              child: Text(tr(context, 'Contactar a $firstName', 'Contact $firstName')),
            ),
          ),
          Center(
            child: TextButton(
              onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(tr(context, 'Guardado (demostración)', 'Saved (demo)')),
                ),
              ),
              child: Text(
                tr(context, 'Guardar para después', 'Save for later'),
                style: GoogleFonts.montserrat(fontWeight: FontWeight.w700, color: c.brand),
              ),
            ),
          ),
        ],
      ),
    );
  }
}