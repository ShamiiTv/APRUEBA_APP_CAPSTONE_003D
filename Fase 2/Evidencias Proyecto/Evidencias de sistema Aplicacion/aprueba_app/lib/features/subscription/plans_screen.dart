import 'package:flutter/material.dart';

import '../../core/l10n/l10n.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/theme/wf_colors.dart';
import '../../core/widgets/wf_widgets.dart';
import '../../data/plan_models.dart';
import '../auth/auth_providers.dart';
import 'subscription_providers.dart';
import 'subscription_repository.dart';

class PlansScreen extends ConsumerStatefulWidget {
  const PlansScreen({super.key, this.limitReached = false});

  /// true cuando se llega desde el límite diario.
  final bool limitReached;

  @override
  ConsumerState<PlansScreen> createState() => _PlansScreenState();
}

class _PlansScreenState extends ConsumerState<PlansScreen> {
  String _cycle = 'yearly';

  @override
  Widget build(BuildContext context) {
    final plansAsync = ref.watch(plansProvider);
    final current = ref.watch(profileProvider).value?.plan ?? 'free';
    final c = WfColors.of(context);

    return Scaffold(
      body: SafeArea(
        child: plansAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    e is SubscriptionException
                        ? e.message
                        : tr(
                            context,
                            'No se pudieron cargar los planes.',
                            'Could not load the plans.',
                          ),
                    textAlign: TextAlign.center,
                    style: TextStyle(color: c.danger),
                  ),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: () => ref.invalidate(plansProvider),
                    child: Text(tr(context, 'Reintentar', 'Retry')),
                  ),
                ],
              ),
            ),
          ),
          data: (plans) => _content(context, plans, current),
        ),
      ),
    );
  }

  Widget _content(BuildContext context, List<Plan> plans, String current) {
    final c = WfColors.of(context);
    final tt = Theme.of(context).textTheme;
    final paid = plans.where((p) => !p.isFree).toList();

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 24),
      children: [
        const Center(child: Text('🚀', style: TextStyle(fontSize: 36))),
        const SizedBox(height: 6),
        Center(
          child: Text(
            widget.limitReached
                ? tr(
                    context,
                    'Llegaste al límite diario',
                    'You reached the daily limit',
                  )
                : tr(context, 'Elige tu plan', 'Choose your plan'),
            style: tt.headlineSmall,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          widget.limitReached
              ? tr(
                  context,
                  'Has usado tus preguntas gratis de hoy.',
                  'You have used today\'s free questions.',
                )
              : tr(
                  context,
                  'Practica sin límite diario.',
                  'Practice with no daily limit.',
                ),
          textAlign: TextAlign.center,
          style: GoogleFonts.inter(fontSize: 13, color: c.muted),
        ),
        const SizedBox(height: 14),
        _toggle(c),
        for (final p in paid) _planCard(context, p, current),
        const SizedBox(height: 6),
        TextButton(
          onPressed: () => context.go('/home'),
          child: Text(
            widget.limitReached
                ? tr(
                    context,
                    'Volver mañana gratis',
                    'Come back tomorrow for free',
                  )
                : tr(context, 'Ahora no', 'Not now'),
          ),
        ),
      ],
    );
  }

  Widget _toggle(WfColors c) {
    Widget seg(String label, String value) {
      final on = _cycle == value;
      return Expanded(
        child: InkWell(
          borderRadius: BorderRadius.circular(8),
          onTap: () => setState(() => _cycle = value),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 8),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: on ? c.brand : Colors.transparent,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              label,
              style: GoogleFonts.montserrat(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: on ? Colors.white : c.muted,
              ),
            ),
          ),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: c.soft,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: c.line, width: 1.5),
      ),
      child: Row(
        children: [
          seg('Mensual', 'monthly'),
          seg('Anual · 2 meses gratis', 'yearly'),
        ],
      ),
    );
  }

  Widget _planCard(BuildContext context, Plan p, String current) {
    final c = WfColors.of(context);
    final isCurrent = current == p.id;
    final price = p.priceFor(_cycle);
    final suffix = _cycle == 'yearly'
        ? tr(context, '/año', '/year')
        : tr(context, '/mes', '/month');
    final onTap = isCurrent
        ? null
        : () => context.push('/checkout?plan=${p.id}&cycle=$_cycle');
    final label = isCurrent
        ? tr(context, 'Plan actual', 'Current plan')
        : tr(context, 'Elegir plan', 'Choose plan');

    return Padding(
      padding: const EdgeInsets.only(top: 11),
      child: Container(
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(
          color: c.soft,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: p.popular ? c.brand : c.line,
            width: p.popular ? 2 : 1.5,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    p.name,
                    style: GoogleFonts.inter(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                if (p.popular)
                  WfTag(
                    text: tr(context, 'Más elegido', 'Most popular'),
                    bg: Color(0x2110B981),
                    fg: Color(0xFF059669),
                  ),
              ],
            ),
            const SizedBox(height: 4),
            Text.rich(
              TextSpan(
                children: [
                  TextSpan(
                    text: formatClp(price),
                    style: GoogleFonts.montserrat(
                      fontSize: 26,
                      fontWeight: FontWeight.w800,
                      color: c.brand,
                    ),
                  ),
                  TextSpan(
                    text: suffix,
                    style: GoogleFonts.montserrat(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: c.muted,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 4),
            for (final f in p.features)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '✓ ',
                      style: TextStyle(
                        color: c.success,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    Expanded(
                      child: Text(
                        f,
                        style: GoogleFonts.inter(fontSize: 12, color: c.muted),
                      ),
                    ),
                  ],
                ),
              ),
            const SizedBox(height: 12),
            p.popular
                ? FilledButton(onPressed: onTap, child: Text(label))
                : OutlinedButton(onPressed: onTap, child: Text(label)),
          ],
        ),
      ),
    );
  }
}
