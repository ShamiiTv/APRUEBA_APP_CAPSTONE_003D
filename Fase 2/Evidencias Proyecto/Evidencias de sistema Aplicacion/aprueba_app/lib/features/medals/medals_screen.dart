import 'package:flutter/material.dart';

import '../../core/l10n/l10n.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/theme/app_colors.dart';
import '../../core/utils/tier_names.dart';
import '../../core/theme/wf_colors.dart';
import '../../core/widgets/wf_widgets.dart';
import '../../data/user_profile.dart';
import '../auth/auth_providers.dart';
import '../auth/auth_repository.dart';
import '../../core/widgets/medal_toast.dart';
import 'medals_providers.dart';
import 'medals_repository.dart';

class MedalsScreen extends ConsumerWidget {
  const MedalsScreen({super.key});

  // (nivel, nombre, color, siguiente)
  static const _tiers = [
    ('bronze', 'Bronce', AppColors.bronze, 'silver'),
    ('silver', 'Plata', AppColors.silver, 'gold'),
    ('gold', 'Oro', AppColors.gold, 'diamond'),
    ('diamond', 'Diamante', AppColors.diamond, 'platinum'),
    ('platinum', 'Platino', AppColors.platinum, null),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(profileProvider);
    final c = WfColors.of(context);

    return Scaffold(
      body: SafeArea(
        child: profile.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    error is ApiException
                        ? error.message
                        : tr(
                            context,
                            'Ocurrió un error inesperado.',
                            'An unexpected error occurred.',
                          ),
                    style: TextStyle(color: c.danger),
                  ),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: () => ref.invalidate(profileProvider),
                    child: Text(tr(context, 'Reintentar', 'Retry')),
                  ),
                ],
              ),
            ),
          ),
          data: (user) => _content(context, ref, user),
        ),
      ),
    );
  }

  Widget _content(BuildContext context, WidgetRef ref, UserProfile user) {
    final c = WfColors.of(context);
    final tt = Theme.of(context).textTheme;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
      children: [
        Row(
          children: [
            Text(
              tr(context, 'Mis Medallas', 'My Medals'),
              style: tt.headlineSmall,
            ),
            const Spacer(),
            WfTag(
              text: '🔥 ${daysLabel(context, user.streak)}',
              bg: const Color(0x2EF5B041),
              fg: const Color(0xFFB45309),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          tr(
            context,
            'Ganas medallas respondiendo y practicando cada día.',
            'You earn medals by answering and practicing every day.',
          ),
          style: GoogleFonts.inter(fontSize: 13, color: c.muted),
        ),
        const SizedBox(height: 4),
        for (final t in _tiers) _row(context, ref, user, t),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: () => context.push('/medals/exchange'),
                child: Text(
                  tr(context, '🔄 Canje de medallas', '🔄 Exchange medals'),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: OutlinedButton(
                onPressed: () => context.push('/medals/gifts'),
                child: Text(tr(context, '🎁 Regalar', '🎁 Gift')),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        FilledButton(
          onPressed: () => context.push('/medals/benefits'),
          child: Text(
            tr(context, '🏷️ Beneficios de marca', '🏷️ Brand benefits'),
          ),
        ),
      ],
    );
  }

  /// Canje directo desde la fila: 5 de un nivel = 1 del siguiente.
  Future<void> _exchange(
    BuildContext context,
    WidgetRef ref,
    String from,
    String to,
  ) async {
    try {
      await ref.read(medalsRepositoryProvider).exchange(from);
      await ref.read(profileProvider.notifier).refresh();
      if (context.mounted) showMedalToast(context, to, 1);
    } on MedalsException catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }

  Widget _row(
    BuildContext context,
    WidgetRef ref,
    UserProfile user,
    (String, String, Color, String?) t,
  ) {
    final c = WfColors.of(context);
    final count = user.medals[t.$1] ?? 0;
    final next = t.$4;
    final prog = next == null ? 0.0 : (count % 5) / 5;

    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: c.line, width: 1.5),
      ),
      child: Row(
        children: [
          MedalCoin(tier: t.$1, size: 40),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      tierName(context, t.$1),
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const Spacer(),
                    Text(
                      '$count',
                      style: GoogleFonts.montserrat(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        color: t.$3,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                if (next != null) ...[
                  Row(
                    children: [
                      Text(
                        '${count % 5}/5 →',
                        style: GoogleFonts.inter(fontSize: 11, color: c.muted),
                      ),
                      const SizedBox(width: 4),
                      MedalCoin(tier: next, size: 20),
                      const Spacer(),
                      Text(
                        '${(prog * 100).round()}%',
                        style: GoogleFonts.montserrat(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: t.$3,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  WfBar(value: prog, color: t.$3, height: 6),
                ] else
                  Text(
                    tr(
                      context,
                      '5 platino = 1 beneficio',
                      '5 platinum = 1 benefit',
                    ),
                    style: GoogleFonts.inter(fontSize: 11, color: c.muted),
                  ),
              ],
            ),
          ),
          if (next != null && count >= 5) ...[
            const SizedBox(width: 8),
            FilledButton(
              onPressed: () => _exchange(context, ref, t.$1, next),
              style: FilledButton.styleFrom(
                backgroundColor: t.$3,
                foregroundColor: t.$1 == 'gold' ? AppColors.azul : Colors.white,
                minimumSize: const Size(0, 34),
                padding: const EdgeInsets.symmetric(horizontal: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
                textStyle: GoogleFonts.montserrat(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
              child: Text(tr(context, 'Canjear →', 'Exchange →')),
            ),
          ],
        ],
      ),
    );
  }
}
