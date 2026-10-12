import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/l10n/l10n.dart';
import '../../core/theme/wf_colors.dart';
import '../../core/widgets/wf_widgets.dart';
import '../../data/plan_models.dart';
import '../auth/auth_providers.dart';
import 'subscription_providers.dart';
import 'subscription_repository.dart';

class ManagePlanScreen extends ConsumerStatefulWidget {
  const ManagePlanScreen({super.key});

  @override
  ConsumerState<ManagePlanScreen> createState() => _ManagePlanScreenState();
}

class _ManagePlanScreenState extends ConsumerState<ManagePlanScreen> {
  bool _busy = false;

  void _snack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  Future<void> _run(Future<void> Function() action, String done) async {
    setState(() => _busy = true);
    try {
      await action();
      await ref.read(profileProvider.notifier).refresh();
      ref.invalidate(subscriptionProvider);
      ref.invalidate(invoicesProvider);
      _snack(done);
    } on SubscriptionException catch (e) {
      _snack(e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  /// Devuelve null (volver), false (al final del período) o true (ahora mismo).
  Future<bool?> _askCancel(SubscriptionInfo sub) {
    return showDialog<bool?>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(tr(ctx, '¿Cancelar suscripción?', 'Cancel subscription?')),
        content: Text(
          tr(
            ctx,
            'Puedes seguir usando tu plan hasta el ${sub.currentPeriodEnd ?? 'fin del período'} o cancelar ahora y volver al plan gratis (20 preguntas al día).',
            'You can keep your plan until ${sub.currentPeriodEnd ?? 'the end of the period'} or cancel now and go back to the free plan (20 questions a day).',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(tr(ctx, 'Volver', 'Back')),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text(tr(ctx, 'Al final del período', 'At period end')),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: Text(tr(ctx, 'Ahora mismo', 'Right now')),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = WfColors.of(context);
    final tt = Theme.of(context).textTheme;
    final subAsync = ref.watch(subscriptionProvider);
    final plans = ref.watch(plansProvider).value ?? const <Plan>[];

    return Scaffold(
      appBar: AppBar(
        title: Text(tr(context, 'Mi plan', 'My plan')),
        leading: BackButton(onPressed: () => context.pop()),
      ),
      body: subAsync.when(
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
                          'No se pudo cargar tu suscripción.',
                          'Could not load your subscription.',
                        ),
                  textAlign: TextAlign.center,
                  style: TextStyle(color: c.danger),
                ),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: () => ref.invalidate(subscriptionProvider),
                  child: Text(tr(context, 'Reintentar', 'Retry')),
                ),
              ],
            ),
          ),
        ),
        data: (sub) {
          final match = plans.where((p) => p.id == sub.plan);
          final name = match.isEmpty ? sub.plan : match.first.name;
          final isFree = !sub.isActive;
          final cycleLabel = sub.billingCycle == 'yearly'
              ? tr(context, 'Anual', 'Yearly')
              : tr(context, 'Mensual', 'Monthly');

          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(13),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Text(
                            tr(context, 'Plan actual', 'Current plan'),
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const Spacer(),
                          WfTag(
                            text: isFree
                                ? tr(
                                    context,
                                    'Gratis · 20 preguntas/día',
                                    'Free · 20 questions/day',
                                  )
                                : name,
                            bg: isFree ? null : const Color(0x2110B981),
                            fg: isFree ? null : const Color(0xFF059669),
                          ),
                        ],
                      ),
                      if (!isFree) ...[
                        const SizedBox(height: 10),
                        _row(
                          context,
                          tr(context, 'Ciclo', 'Billing'),
                          cycleLabel,
                        ),
                        _row(
                          context,
                          sub.cancelAtPeriodEnd
                              ? tr(context, 'Activo hasta', 'Active until')
                              : tr(context, 'Próximo cobro', 'Next charge'),
                          sub.currentPeriodEnd ?? '-',
                        ),
                        if (sub.cardLast4 != null)
                          _row(
                            context,
                            tr(context, 'Método de pago', 'Payment method'),
                            '${(sub.cardBrand ?? 'card').toUpperCase()} ·· ${sub.cardLast4}',
                          ),
                        if (sub.status == 'past_due')
                          Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: Text(
                              tr(
                                context,
                                'No pudimos cobrar tu último pago.',
                                'We could not charge your last payment.',
                              ),
                              style: TextStyle(color: c.danger, fontSize: 12),
                            ),
                          ),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 11),
              if (isFree)
                Container(
                  padding: const EdgeInsets.all(13),
                  decoration: BoxDecoration(
                    color: c.brand.withValues(alpha: 0.05),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: c.brand, width: 1.5),
                  ),
                  child: Row(
                    children: [
                      const Text('🚀', style: TextStyle(fontSize: 24)),
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
                              style: tt.titleMedium?.copyWith(fontSize: 13),
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
                    ],
                  ),
                )
              else if (sub.cancelAtPeriodEnd)
                Container(
                  padding: const EdgeInsets.all(13),
                  decoration: BoxDecoration(
                    color: const Color(0x2EF5B041),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Text(
                    tr(
                      context,
                      'Tu suscripción termina el ${sub.currentPeriodEnd}. Después volverás al plan gratis.',
                      'Your subscription ends on ${sub.currentPeriodEnd}. After that you will return to the free plan.',
                    ),
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      color: const Color(0xFFB45309),
                    ),
                  ),
                )
              else
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(13),
                    child: Text(
                      tr(
                        context,
                        'Tu plan incluye preguntas ilimitadas cada día.',
                        'Your plan includes unlimited questions every day.',
                      ),
                      style: GoogleFonts.inter(fontSize: 12, color: c.muted),
                    ),
                  ),
                ),
              const SizedBox(height: 24),
              if (isFree)
                FilledButton(
                  onPressed: () => context.push('/plans'),
                  child: Text(
                    tr(context, 'Mejorar a ilimitado', 'Upgrade to unlimited'),
                  ),
                )
              else ...[
                if (sub.cancelAtPeriodEnd)
                  FilledButton(
                    onPressed: _busy
                        ? null
                        : () => _run(
                            () => ref
                                .read(subscriptionRepositoryProvider)
                                .change(plan: sub.plan),
                            tr(
                              context,
                              'Suscripción reactivada.',
                              'Subscription reactivated.',
                            ),
                          ),
                    child: Text(
                      tr(
                        context,
                        'Reactivar suscripción',
                        'Reactivate subscription',
                      ),
                    ),
                  ),
                OutlinedButton(
                  onPressed: _busy ? null : () => context.push('/plans'),
                  child: Text(
                    tr(
                      context,
                      'Cambiar plan o ciclo',
                      'Change plan or billing',
                    ),
                  ),
                ),
                if (!sub.cancelAtPeriodEnd)
                  TextButton(
                    onPressed: _busy
                        ? null
                        : () async {
                            final immediate = await _askCancel(sub);
                            if (immediate == null || !context.mounted) return;
                            await _run(
                              () => ref
                                  .read(subscriptionRepositoryProvider)
                                  .cancel(immediate: immediate),
                              tr(
                                context,
                                'Suscripción cancelada.',
                                'Subscription canceled.',
                              ),
                            );
                          },
                    style: TextButton.styleFrom(foregroundColor: c.danger),
                    child: _busy
                        ? const SizedBox(
                            height: 18,
                            width: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Text(
                            tr(
                              context,
                              'Cancelar suscripción',
                              'Cancel subscription',
                            ),
                          ),
                  ),
              ],
              const SizedBox(height: 8),
              TextButton(
                onPressed: () => context.push('/invoices'),
                child: Text(
                  tr(context, 'Historial de pagos', 'Payment history'),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _row(BuildContext context, String label, String value) {
    final c = WfColors.of(context);
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Row(
        children: [
          Text(label, style: GoogleFonts.inter(fontSize: 12, color: c.muted)),
          const Spacer(),
          Text(
            value,
            style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}
