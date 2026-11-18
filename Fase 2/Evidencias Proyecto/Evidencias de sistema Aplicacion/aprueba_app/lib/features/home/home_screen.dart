import '../../core/widgets/content_skeleton.dart';

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
import '../practice/practice_providers.dart';
import '../notifications/notifications_providers.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  static const _tiers = ['bronze', 'silver', 'gold', 'diamond', 'platinum'];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(profileProvider);
    final tests = ref.watch(testsProvider).value ?? const <PracticeTest>[];
    final progressState = ref.watch(progressProvider);
    final progressSnapshot = ref.watch(progressSnapshotProvider);
    final progress = progressState.value ?? const <String, ProgressItem>{};
    final c = WfColors.of(context);

    return Scaffold(
      body: SafeArea(
        child: profile.when(
          loading: () => const ContentSkeleton(kind: 'home'),
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
          data: (user) => RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(profileProvider);
              ref.invalidate(testsProvider);
              ref.invalidate(progressSnapshotProvider);
              ref.invalidate(progressProvider);
              try {
                await ref.read(profileProvider.future);
                await ref.read(progressProvider.future);
              } catch (_) {
                /* Providers expose retryable errors in the screen. */
              }
            },
            child: _content(
              context,
              user,
              tests,
              progress,
              progressReady: progressState.hasValue,
              progressError: progressState.hasError,
              studyStreak: (progressSnapshot.value?['streak'] as num?)?.toInt(),
              accessQuota: progressSnapshot.value?['quota'] as Map?,
            ),
          ),
        ),
      ),
    );
  }

  Widget _metric(
    BuildContext context,
    String label,
    String value,
    IconData icon,
    Color accent,
  ) {
    final c = WfColors.of(context);
    final iconColor = Theme.of(context).brightness == Brightness.dark
        ? Color.lerp(accent, Colors.white, .5)!
        : accent;
    return Container(
      padding: const EdgeInsets.all(17),
      decoration: BoxDecoration(
        color: c.bg,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: c.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: iconColor, size: 23),
          const SizedBox(height: 11),
          Text(
            label,
            style: TextStyle(fontSize: 11, height: 1.6, color: c.muted),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 29,
              fontWeight: FontWeight.w800,
              color: c.ink,
            ),
          ),
        ],
      ),
    );
  }

  Widget _content(
    BuildContext context,
    UserProfile user,
    List<PracticeTest> tests,
    Map<String, ProgressItem> progress, {
    required bool progressReady,
    required bool progressError,
    required int? studyStreak,
    required Map? accessQuota,
  }) {
    final c = WfColors.of(context);
    final tt = Theme.of(context).textTheme;
    const warnBg = Color(0x2EF5B041);
    final warnFg = Theme.of(context).brightness == Brightness.dark
        ? const Color(0xFFFFCF79)
        : const Color(0xFF8A4700);

    final bronze = user.medals['bronze'] ?? 0;
    final quotaMax = (accessQuota?['max'] as num?)?.toInt() ?? user.quotaMax;
    final quotaUsed = (accessQuota?['used'] as num?)?.toInt() ?? user.quotaUsed;
    final unlimited = accessQuota != null
        ? accessQuota['unlimited'] == true
        : user.unlimited;
    final unlimitedTestId = accessQuota != null
        ? accessQuota['unlimitedTestId'] as String?
        : user.unlimitedTestId;
    final quotaProgress = unlimited || quotaMax <= 0
        ? 1.0
        : quotaUsed / quotaMax;

    final answered = progress.values.fold<int>(
      0,
      (sum, item) => sum + item.answered,
    );
    final correct = progress.values.fold<int>(
      0,
      (sum, item) => sum + item.correct,
    );
    final availableTests = tests
        .where(
          (test) =>
              test.hasQuestions &&
              (!progressReady || (progress[test.id]?.percent ?? 0) < 100),
        )
        .toList();
    final preferred =
        availableTests
            .where((test) => test.id == unlimitedTestId)
            .firstOrNull ??
        availableTests
            .where((test) => user.selectedTests.contains(test.id))
            .firstOrNull ??
        availableTests.firstOrNull;
    final allowed =
        preferred != null &&
        (unlimited || unlimitedTestId == preferred.id || quotaUsed < quotaMax);

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
                fontSize: 23,
                fontWeight: FontWeight.w800,
                color: c.brand,
              ),
            ),
            const Spacer(),
            WfTag(
              text: studyStreak == null
                  ? '—'
                  : '🔥 ${daysLabel(context, studyStreak)}',
              bg: warnBg,
              fg: warnFg,
            ),
            const SizedBox(width: 2),
            const _BellButton(),
          ],
        ),
        const SizedBox(height: 12),

        Container(
          padding: const EdgeInsets.all(23),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(22),
            gradient: const LinearGradient(
              colors: [Color(0xFF19375F), Color(0xFF2A5282)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Align(
                alignment: Alignment.centerLeft,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 11,
                    vertical: 7,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: .1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    unlimited
                        ? tr(
                            context,
                            'Acceso completo · Sin límite diario',
                            'Full access · No daily limit',
                          )
                        : unlimitedTestId != null
                        ? '${testName(context, unlimitedTestId, unlimitedTestId)} · ${tr(context, 'Sin límite diario', 'No daily limit')}'
                        : tr(
                            context,
                            'Plan gratuito · $quotaMax preguntas al día',
                            'Free plan · $quotaMax questions per day',
                          ),
                    style: const TextStyle(
                      color: Color(0xFFE4EFFF),
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              Text(
                tr(
                  context,
                  '¡Hola, ${user.name.split(' ').first}!',
                  'Hello, ${user.name.split(' ').first}!',
                ),
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 25,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                answered == 0
                    ? tr(
                        context,
                        'Tu próximo logro empieza con una pregunta. Elige una prueba y comienza a construir tu progreso.',
                        'Your next achievement starts with one question. Choose a test and start building your progress.',
                      )
                    : tr(
                        context,
                        'Cada respuesta te ayuda a avanzar. Continúa a tu ritmo.',
                        'Every answer helps you move forward. Continue at your pace.',
                      ),
                style: const TextStyle(
                  color: Color(0xFFDCE8F8),
                  fontSize: 13,
                  height: 1.8,
                ),
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: allowed
                    ? () => context.push('/levels?testId=${preferred.id}')
                    : null,
                child: Text(
                  answered == 0
                      ? tr(context, 'Comenzar a practicar', 'Start practicing')
                      : tr(context, 'Continuar práctica', 'Continue practice'),
                ),
              ),
              const SizedBox(height: 8),
              OutlinedButton(
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.white,
                  side: const BorderSide(color: Colors.white38),
                ),
                onPressed: () => context.push('/study-plan'),
                child: Text(tr(context, 'Mi plan de estudio', 'My study plan')),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: _metric(
                context,
                tr(context, 'Respondidas', 'Answered'),
                progressReady ? '$answered' : '—',
                Icons.trending_up,
                const Color(0xFF7C5CCE),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _metric(
                context,
                tr(context, 'Aciertos', 'Correct'),
                progressReady ? '$correct' : '—',
                Icons.check_circle_outline,
                const Color(0xFF16856B),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _metric(
                context,
                tr(context, 'Porcentaje de aciertos', 'Accuracy'),
                !progressReady || answered == 0
                    ? '—'
                    : '${(correct * 100 / answered).round()}%',
                Icons.track_changes,
                const Color(0xFF3876C5),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _metric(
                context,
                tr(context, 'Racha de estudio', 'Study streak'),
                studyStreak?.toString() ?? '—',
                Icons.local_fire_department_outlined,
                const Color(0xFFA36A00),
              ),
            ),
          ],
        ),
        const SizedBox(height: 20),
        if (progressError)
          Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: Text(
              tr(
                context,
                'No se pudo cargar tu avance. Desliza hacia abajo para reintentar.',
                'Could not load your progress. Pull down to retry.',
              ),
              style: TextStyle(color: c.danger, fontSize: 12, height: 1.6),
            ),
          ),
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
                        opacity: 1,
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

        const SizedBox(height: 12),
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
                      unlimitedTestId != null
                          ? tr(context, 'Otras pruebas', 'Other tests')
                          : tr(context, 'Cuota diaria', 'Daily quota'),
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const Spacer(),
                    Text(
                      unlimited
                          ? tr(context, 'Sin límite', 'No limit')
                          : tr(
                              context,
                              '$quotaUsed de $quotaMax usadas',
                              '$quotaUsed of $quotaMax used',
                            ),
                      style: GoogleFonts.inter(fontSize: 11, color: c.muted),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                WfBar(value: quotaProgress),
                if (unlimitedTestId != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    '${testName(context, unlimitedTestId, unlimitedTestId)} · ${tr(context, 'Sin límite diario', 'No daily limit')}',
                    style: TextStyle(fontSize: 12, color: c.ink),
                  ),
                ],
                if (!unlimited) ...[
                  const SizedBox(height: 6),
                  Text(
                    tr(
                      context,
                      '10 base + 5 colegio + 5 dirección · 20 máx gratis.',
                      '10 base + 5 school + 5 address · 20 free max.',
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

        const SizedBox(height: 24),
        Text(
          tr(context, 'Explora Aprueba', 'Explore Aprueba'),
          style: tt.titleLarge,
        ),
        const SizedBox(height: 4),
        Text(
          tr(
            context,
            'Todo lo que puedes hacer, en un solo lugar.',
            'Everything you can do, in one place.',
          ),
          style: TextStyle(color: c.muted, fontSize: 13),
        ),
        const SizedBox(height: 12),
        LayoutBuilder(
          builder: (context, constraints) {
            final entries = [
              (
                Icons.emoji_events_outlined,
                tr(context, 'Mis medallas', 'My medals'),
                tr(context, 'Canjea y regala', 'Exchange and gift'),
                '/medals',
              ),
              (
                Icons.groups_outlined,
                tr(context, 'Grupos de estudio', 'Study groups'),
                tr(context, 'Invita y comparte', 'Invite and share'),
                '/groups',
              ),
              (
                Icons.school_outlined,
                tr(context, 'Tutores', 'Tutors'),
                tr(
                  context,
                  'Encuentra apoyo para estudiar',
                  'Find study support',
                ),
                '/tutors',
              ),
              (
                Icons.forum_outlined,
                tr(context, 'Comunidad', 'Community'),
                tr(context, 'Aprende con otros', 'Learn with others'),
                '/feed',
              ),
              (
                Icons.person_outline,
                tr(context, 'Mi perfil', 'My profile'),
                tr(context, 'Datos y privacidad', 'Data and privacy'),
                '/my-data',
              ),
              (
                Icons.settings_outlined,
                tr(context, 'Ajustes', 'Settings'),
                tr(context, 'Tema e idioma', 'Theme and language'),
                '/settings',
              ),
            ];
            final columns = constraints.maxWidth < 300 ? 1 : 2;
            return Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                for (final e in entries)
                  SizedBox(
                    width:
                        (constraints.maxWidth - 10 * (columns - 1)) / columns,
                    child: Card(
                      clipBehavior: Clip.antiAlias,
                      child: InkWell(
                        onTap: () {
                          if (e.$4 == '/my-data') {
                            context.push(e.$4);
                          } else {
                            context.go(e.$4);
                          }
                        },
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Icon(e.$1, color: c.brand, size: 26),
                              const SizedBox(height: 10),
                              Text(
                                e.$2,
                                style: TextStyle(
                                  color: c.ink,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 13,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                e.$3,
                                style: TextStyle(color: c.muted, fontSize: 11),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            );
          },
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
                        Expanded(
                          child: Text(
                            testName(context, t.id, t.label),
                            style: GoogleFonts.inter(fontSize: 14),
                          ),
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

/// Campana de notificaciones con puntito cuando hay no leídas.
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
      icon: Stack(
        clipBehavior: Clip.none,
        children: [
          const Icon(Icons.notifications_outlined),
          if (unread > 0)
            Positioned(
              right: -4,
              top: -4,
              child: Container(
                constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                padding: const EdgeInsets.symmetric(horizontal: 4),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: const Color(0xFFEF4444),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.white, width: 1.5),
                ),
                child: Text(
                  unread > 9 ? '9+' : '$unread',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 9,
                    fontWeight: FontWeight.w800,
                    height: 1.1,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
