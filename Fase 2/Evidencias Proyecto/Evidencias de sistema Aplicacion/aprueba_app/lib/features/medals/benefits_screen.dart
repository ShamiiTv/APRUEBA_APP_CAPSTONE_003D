import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter/services.dart';

import '../../core/l10n/l10n.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/wf_colors.dart';
import '../../core/widgets/wf_widgets.dart';
import '../../data/benefit_models.dart';
import '../auth/auth_providers.dart';
import 'medals_providers.dart';
import 'medals_repository.dart';

class BenefitsScreen extends ConsumerWidget {
  const BenefitsScreen({super.key});

  Future<void> _redeem(BuildContext context, WidgetRef ref, Benefit b) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(tr(ctx, '¿Canjear beneficio?', 'Redeem benefit?')),
        content: Text(
          tr(
            ctx,
            'Se descontarán ${b.costPlatinum} medallas de Platino por "${b.name}". No se puede deshacer.',
            '${b.costPlatinum} Platinum medals will be spent on "${b.name}". This cannot be undone.',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text(tr(ctx, 'Cancelar', 'Cancel')),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: Text(tr(ctx, 'Canjear', 'Redeem')),
          ),
        ],
      ),
    );
    if (ok != true || !context.mounted) return;

    try {
      final r = await ref.read(medalsRepositoryProvider).redeem(b.id);
      await ref.read(profileProvider.notifier).refresh();
      ref.invalidate(benefitsProvider);
      if (!context.mounted) return;
      await showDialog<void>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text(tr(ctx, '¡Beneficio canjeado!', 'Benefit redeemed!')),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(r.benefit),
              const SizedBox(height: 10),
              Text(tr(ctx, 'Tu código:', 'Your code:')),
              SelectableText(
                r.couponCode,
                style: GoogleFonts.montserrat(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () =>
                  Clipboard.setData(ClipboardData(text: r.couponCode)),
              child: Text(tr(ctx, 'Copiar', 'Copy')),
            ),
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: Text(tr(ctx, 'Listo', 'Done')),
            ),
          ],
        ),
      );
    } on MedalsException catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.message)));
      }
      ref.invalidate(benefitsProvider);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = WfColors.of(context);
    final benefits = ref.watch(benefitsProvider);
    final plat = ref.watch(profileProvider).value?.medals['platinum'] ?? 0;

    return Scaffold(
      appBar: AppBar(
        title: Text(tr(context, 'Beneficios de marca', 'Brand benefits')),
        leading: BackButton(onPressed: () => context.pop()),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        children: [
          Text(
            tr(
              context,
              'Canjea 5 medallas de Platino por un beneficio exclusivo de nuestros socios.',
              'Exchange 5 Platinum medals for an exclusive benefit from our partners.',
            ),
            style: GoogleFonts.inter(fontSize: 13, color: c.muted),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.platinum.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.platinum, width: 1.5),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const MedalCoin(tier: 'platinum', size: 40),
                    const SizedBox(width: 8),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '$plat / 5',
                          style: GoogleFonts.montserrat(
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF7C3AED),
                          ),
                        ),
                        Text(
                          tr(
                            context,
                            'Platino para desbloquear',
                            'Platinum to unlock',
                          ),
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            color: c.muted,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                WfBar(value: plat / 5, color: AppColors.platinum, height: 7),
                const SizedBox(height: 6),
                Text(
                  tr(
                    context,
                    'Ruta: 625 bronce → 125 plata → 25 oro → 5 diamante → 1 platino',
                    'Path: 625 bronze → 125 silver → 25 gold → 5 diamond → 1 platinum',
                  ),
                  style: GoogleFonts.inter(fontSize: 11, color: c.muted),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.only(top: 16, bottom: 4),
            child: Text(
              tr(context, 'BENEFICIOS DISPONIBLES', 'AVAILABLE BENEFITS'),
              style: GoogleFonts.montserrat(
                fontSize: 10,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.8,
                color: c.muted,
              ),
            ),
          ),
          benefits.when(
            loading: () => const Padding(
              padding: EdgeInsets.all(24),
              child: Center(child: CircularProgressIndicator()),
            ),
            error: (e, _) => Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Text(
                    e is MedalsException
                        ? e.message
                        : tr(
                            context,
                            'No se pudieron cargar los beneficios.',
                            'Could not load the benefits.',
                          ),
                    textAlign: TextAlign.center,
                    style: TextStyle(color: c.danger),
                  ),
                  const SizedBox(height: 10),
                  FilledButton(
                    onPressed: () => ref.invalidate(benefitsProvider),
                    child: Text(tr(context, 'Reintentar', 'Retry')),
                  ),
                ],
              ),
            ),
            data: (list) {
              if (list.isEmpty) {
                return Padding(
                  padding: const EdgeInsets.all(20),
                  child: Text(
                    tr(
                      context,
                      'Todavía no hay beneficios disponibles.',
                      'There are no benefits available yet.',
                    ),
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(fontSize: 13, color: c.muted),
                  ),
                );
              }
              return Column(
                children: [for (final b in list) _benefitCard(context, ref, b)],
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _benefitCard(BuildContext context, WidgetRef ref, Benefit b) {
    final c = WfColors.of(context);
    final unlocked = b.unlocked;

    return Opacity(
      opacity: unlocked ? 1 : 0.65,
      child: Container(
        margin: const EdgeInsets.only(top: 10),
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: c.line, width: 1.5),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: c.soft,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: c.line),
              ),
              child: Text(b.emoji, style: const TextStyle(fontSize: 20)),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    b.name,
                    style: GoogleFonts.montserrat(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  if (b.description.isNotEmpty)
                    Text(
                      b.description,
                      style: GoogleFonts.inter(fontSize: 11, color: c.muted),
                    ),
                  if (b.sponsorName.isNotEmpty)
                    Text(
                      b.sponsorName,
                      style: GoogleFonts.inter(fontSize: 10, color: c.muted),
                    ),
                  const SizedBox(height: 4),
                  unlocked
                      ? WfTag(
                          text: tr(
                            context,
                            '✅ Disponible para canjear',
                            '✅ Available to redeem',
                          ),
                          bg: Color(0x2110B981),
                          fg: Color(0xFF059669),
                        )
                      : WfTag(
                          text: b.inStock
                              ? '🔒 Necesitas ${b.costPlatinum} ⬡ Platino'
                              : '⛔ Agotado',
                          bg: const Color(0x24A78BFA),
                          fg: const Color(0xFF7C3AED),
                        ),
                ],
              ),
            ),
            if (unlocked)
              TextButton(
                onPressed: () => _redeem(context, ref, b),
                child: Text(tr(context, 'Canjear', 'Redeem')),
              ),
          ],
        ),
      ),
    );
  }
}
