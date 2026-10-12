import 'package:flutter/material.dart';

import '../../core/utils/tier_names.dart';
import '../../core/l10n/l10n.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/theme/wf_colors.dart';
import '../../core/widgets/avatar_circle.dart';
import '../../core/widgets/wf_widgets.dart';
import '../../data/social_models.dart';
import '../auth/auth_providers.dart';
import 'tutor_widgets.dart';

class TutorProfileScreen extends ConsumerWidget {
  const TutorProfileScreen({super.key, required this.tutor});

  final Tutor tutor;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = WfColors.of(context);
    final t = tutor;
    final premium =
        (ref.watch(profileProvider).value?.plan ?? 'free') != 'free';
    final sub = [
      if (t.subjectLabel.isNotEmpty)
        testName(context, t.subjectLabel, t.subjectLabel),
      if (t.mode != null) t.mode!,
    ].join(' · ');

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
              AvatarCircle(name: t.name, color: t.color, size: 60),
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
                            ),
                          ),
                        ),
                        if (t.verified) ...[
                          const SizedBox(width: 6),
                          WfTag(
                            text: tr(context, '✔ Verificado', '✔ Verified'),
                            bg: Color(0x2110B981),
                            fg: Color(0xFF059669),
                          ),
                        ],
                      ],
                    ),
                    if (sub.isNotEmpty)
                      Text(
                        sub,
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
                              tr(
                                context,
                                ' (${t.reviewsCount} reseñas)',
                                ' (${t.reviewsCount} reviews)',
                              ),
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
          if (t.priceLabel != null || t.experienceYears != null) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                if (t.priceLabel != null)
                  Text(
                    t.priceLabel!,
                    style: GoogleFonts.montserrat(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: c.brand,
                    ),
                  ),
                const Spacer(),
                if (t.experienceYears != null)
                  WfTag(
                    text: tr(
                      context,
                      '🎓 ${t.experienceYears} años exp.',
                      '🎓 ${t.experienceYears} yrs exp.',
                    ),
                  ),
              ],
            ),
          ],
          if (t.university != null) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                const Text('🎓', style: TextStyle(fontSize: 16)),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    t.university!,
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ],
          if (t.specialty != null) ...[
            const SizedBox(height: 14),
            Text(
              tr(context, 'ESPECIALIDAD', 'SPECIALTY'),
              style: GoogleFonts.montserrat(
                fontSize: 10,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.8,
                color: c.muted,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              t.specialty!,
              style: GoogleFonts.inter(fontSize: 13, color: c.ink, height: 1.5),
            ),
          ],
          if (t.bio != null) ...[
            const SizedBox(height: 12),
            Text(
              t.bio!,
              style: GoogleFonts.inter(
                fontSize: 13,
                color: c.muted,
                height: 1.5,
              ),
            ),
          ],
          const SizedBox(height: 28),
          FilledButton(
            onPressed: () => premium
                ? context.push('/tutors/contact', extra: t)
                : context.push('/plans'),
            child: Text(
              premium
                  ? tr(context, 'Contactar', 'Contact')
                  : tr(context, 'Contactar · ⭐ Premium', 'Contact · ⭐ Premium'),
            ),
          ),
        ],
      ),
    );
  }
}
