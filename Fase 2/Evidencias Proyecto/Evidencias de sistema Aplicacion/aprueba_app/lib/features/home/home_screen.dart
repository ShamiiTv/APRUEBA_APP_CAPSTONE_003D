import 'package:flutter/material.dart';

import '../../core/l10n/l10n.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/utils/tier_names.dart';
import '../../core/theme/wf_colors.dart';
import '../../core/widgets/wf_widgets.dart';
import '../../data/practice_models.dart';
import '../../data/user_profile.dart';
import '../auth/auth_providers.dart';
import '../auth/auth_repository.dart';
import '../notifications/notifications_providers.dart';
import '../practice/practice_providers.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  static const _tiers = ['bronze', 'silver', 'gold', 'diamond', 'platinum'];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(profileProvider);
    final tests = ref.watch(testsProvider).value ?? const <PracticeTest>[];
    final progress =
        ref.watch(progressProvider).value ?? const <String, ProgressItem>{};
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
          data: (user) => _content(context, user, tests, progress),
        ),
      ),
    );
  }

  Widget _content(
    BuildContext context,
    UserProfile user,
    List<PracticeTest> tests,
    Map<String, ProgressItem> progress,
  ) {
    final c = WfColors.of(context);
    final tt = Theme.of(context).textTheme;
    const warnBg = Color(0x2EF5B041);
    const warnFg = Color(0xFFB45309);

    final bronze = user.medals['bronze'] ?? 0;
    final quotaMax = user.quotaMax;
    final quotaProgress = user.unlimited || quotaMax <= 0
        ? 1.0
        : user.quotaUsed / quotaMax;

    final mine = user.selectedTests
        .map((id) => tests.where((t) => t.id == id))
        .where((it) => it.isNotEmpty)
        .map((it) => it.first)
        .toList();

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
      children: [
        // Encabezado: logo + racha
        Row(
          children: [
            Text(
              'Aprueba',
              style: GoogleFonts.montserrat(
                fontSize: 17,
                fontWeight: FontWeight.w800,
                color: c.brand,
              ),
            ),
            const Spacer(),
            WfTag(
              text: '🔥 ${daysLabel(context, user.streak)}',
              bg: warnBg,
              fg: warnFg,
            ),
            const SizedBox(width: 2),
            const _BellButton(),
          ],
        ),
        const SizedBox(height: 12),

        // Medallas
        Card(
          child: Padding(
            padding: const EdgeInsets.all(10),
            child: Column(
              children: [
                Row(
                  children: [
                    Text(
                      tr(context, 'TUS MEDALLAS', 'YOUR MEDALS'),
                      style: GoogleFonts.montserrat(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: c.muted,
                      ),
                    ),
                    const Spacer(),
                    InkWell(
                      onTap: () => context.go('/medals'),
                      child: Text(
                        tr(context, 'Ver todo →', 'See all →'),
                        style: GoogleFonts.montserrat(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: c.brand,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    for (final t in _tiers)
                      Opacity(
                        opacity: (user.medals[t] ?? 0) > 0 ? 1 : 0.4,
                        child: Column(
                          children: [
                            MedalCoin(tier: t, size: 30),
                            const SizedBox(height: 2),
                            Text(
                              '${user.medals[t] ?? 0}',
                              style: GoogleFonts.montserrat(
                                fontSize: 12,
                                fontWeight: FontWeight.w800,
                                color: c.ink,
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const MedalCoin(tier: 'bronze', size: 24),
                    const SizedBox(width: 6),
                    Text(
                      tr(context, '${bronze % 5}/5 para', '${bronze % 5}/5 to'),
                      style: GoogleFonts.inter(fontSize: 11, color: c.muted),
                    ),
                    const SizedBox(width: 6),
                    const MedalCoin(tier: 'silver', size: 24),
                  ],
                ),
                const SizedBox(height: 6),
                WfBar(value: (bronze % 5) / 5, color: const Color(0xFFCD7F32)),
              ],
            ),
          ),
        ),

        // Cuota diaria
        Card(
          child: Padding(
            padding: const EdgeInsets.all(13),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      tr(context, 'Cuota diaria', 'Daily quota'),
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const Spacer(),
                    Text(
                      user.unlimited
                          ? tr(context, 'Sin límite', 'No limit')
                          : tr(
                              context,
                              '${user.quotaUsed} de $quotaMax usadas',
                              '${user.quotaUsed} of $quotaMax used',
                            ),
                      style: GoogleFonts.inter(fontSize: 11, color: c.muted),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                WfBar(value: quotaProgress),
                if (!user.unlimited) ...[
                  const SizedBox(height: 6),
                  Text(
                    tr(
                      context,
                      'La cuota se renueva cada día.',
                      'Your quota resets every day.',
                    ),
                    style: GoogleFonts.inter(fontSize: 11, color: c.muted),
                  ),
                ],
              ],
            ),
          ),
        ),
        const SizedBox(height: 11),

        // Banner de plan (solo plan gratis)
        if (user.plan == 'free') ...[
          InkWell(
            borderRadius: BorderRadius.circular(14),
            onTap: () => context.push('/plans'),
            child: Container(
              padding: const EdgeInsets.all(13),
              decoration: BoxDecoration(
                color: c.brand.withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: c.brand, width: 1.5),
              ),
              child: Row(
                children: [
                  const Text('🚀', style: TextStyle(fontSize: 22)),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          tr(
                            context,
                            'Desbloquea preguntas ilimitadas',
                            'Unlock unlimited questions',
                          ),
                          style: GoogleFonts.inter(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        Text(
                          tr(
                            context,
                            'Practica sin límite diario.',
                            'Practice with no daily limit.',
                          ),
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            color: c.muted,
                          ),
                        ),
                      ],
                    ),
                  ),
                  WfTag(
                    text: tr(context, 'Mejorar plan ›', 'Upgrade plan ›'),
                    bg: Color(0x2110B981),
                    fg: Color(0xFF059669),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 10),
        ],

        FilledButton(
          onPressed: () => context.go('/practice'),
          child: Text(tr(context, 'Continuar practicando', 'Keep practicing')),
        ),

        // Progreso por prueba
        const SizedBox(height: 18),
        Text(
          tr(context, 'Tu progreso', 'Your progress'),
          style: tt.headlineSmall?.copyWith(fontSize: 15),
        ),
        for (final t in mine)
          Padding(
            padding: const EdgeInsets.only(top: 11),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(13),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Text(
                          testName(context, t.id, t.label),
                          style: GoogleFonts.inter(fontSize: 14),
                        ),
                        const Spacer(),
                        Text(
                          '${progress[t.id]?.percent ?? 0}%',
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            color: c.muted,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    WfBar(
                      value: (progress[t.id]?.percent ?? 0) / 100,
                      color: t.color,
                    ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }
}

/// Campana de notificaciones con el contador de no leídas.
class _BellButton extends ConsumerWidget {
  const _BellButton();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final unread = ref.watch(notificationsProvider).value?.unread ?? 0;
    return IconButton(
      tooltip: tr(context, 'Notificaciones', 'Notifications'),
      onPressed: () async {
        await context.push('/notifications');
        ref.invalidate(notificationsProvider);
      },
      icon: Badge(
        isLabelVisible: unread > 0,
        label: Text('$unread'),
        child: const Icon(Icons.notifications_outlined),
      ),
    );
  }
}
