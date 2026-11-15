import '../../core/widgets/loading_geometry.dart';
import '../../core/widgets/content_skeleton.dart';
import '../../data/plan_models.dart';
import 'subscription_providers.dart';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/l10n/l10n.dart';
import '../../core/network/api_client.dart';
import '../../core/storage/pending_operation.dart';
import '../auth/auth_providers.dart';

class PlansScreen extends ConsumerStatefulWidget {
  const PlansScreen({super.key, this.limitReached = false});
  final bool limitReached;
  @override
  ConsumerState<PlansScreen> createState() => _PlansState();
}

class _PlansState extends ConsumerState<PlansScreen> {
  String testId = 'm1';
  bool busy = false;
  String? message;
  Future<void> choose(String plan) async {
    if (busy) return;
    setState(() => busy = true);
    try {
      final signature = '$plan:$testId';
      await ApiClient.dio.post(
        '/plans/subscribe',
        data: {
          'planId': plan,
          'billingCycle': 'monthly',
          if (plan == 'uni') 'testId': testId,
          'requestId': await PendingOperation.id('plan', signature),
        },
      );
      await PendingOperation.complete('plan');
      await ref.read(profileProvider.notifier).refresh();
      if (mounted) {
        setState(
          () => message = tr(
            context,
            'Plan simulado activado. No se realizó ningún cobro.',
            'Demo plan activated. No payment was made.',
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(
          () => message = tr(
            context,
            'No se pudo simular el plan. Reintenta la misma selección.',
            'Could not simulate the plan. Retry the same selection.',
          ),
        );
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(tr(context, 'Planes', 'Plans'))),
    body: ref
        .watch(plansProvider)
        .when(
          loading: () => const ContentSkeleton(kind: 'plans'),
          error: (error, stack) => Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  tr(
                    context,
                    'No se pudieron cargar los planes.',
                    'Could not load plans.',
                  ),
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () => ref.invalidate(plansProvider),
                  child: Text(tr(context, 'Reintentar', 'Retry')),
                ),
              ],
            ),
          ),
          data: (plans) => ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Text(
                tr(
                  context,
                  'DEMOSTRACIÓN DE PAGOS · Sin cobros ni boletas reales.',
                  'PAYMENT DEMO · No charge or real receipts.',
                ),
              ),
              if (widget.limitReached)
                Text(
                  tr(
                    context,
                    'Agotaste tu cuota diaria gratuita.',
                    'You used your free daily quota.',
                  ),
                ),
              if (message != null)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Text(message!),
                ),
              if (plans.isEmpty)
                Text(
                  tr(
                    context,
                    'No hay planes disponibles.',
                    'No plans available.',
                  ),
                ),
              for (final plan in plans)
                Card(
                  child: ConstrainedBox(
                    constraints: BoxConstraints(
                      minHeight: LoadingGeometry.planHeight(context, plan.id),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            plan.id == 'free'
                                ? tr(context, 'Plan gratuito', 'Free plan')
                                : plan.id == 'uni'
                                ? tr(
                                    context,
                                    'Una prueba ilimitada',
                                    'One unlimited test',
                                  )
                                : tr(context, 'Acceso completo', 'Full access'),
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          const SizedBox(height: 16),
                          Text(
                            '${formatClp(plan.monthly)} CLP / ${tr(context, 'mes', 'month')}',
                            style: Theme.of(context).textTheme.headlineSmall,
                          ),
                          const SizedBox(height: 16),
                          Text(
                            plan.id == 'free'
                                ? tr(
                                    context,
                                    '10 base + 5 colegio + 5 dirección · 20 máximo diario',
                                    '10 base + 5 school + 5 address · 20 daily maximum',
                                  )
                                : plan.id == 'uni'
                                ? tr(
                                    context,
                                    'Preguntas ilimitadas en una prueba por un mes.',
                                    'Unlimited questions in one test for a month.',
                                  )
                                : tr(
                                    context,
                                    'Todas las pruebas por un mes.',
                                    'All tests for one month.',
                                  ),
                          ),
                          if (plan.id == 'uni')
                            DropdownButton<String>(
                              isExpanded: true,
                              value: testId,
                              onChanged: busy
                                  ? null
                                  : (v) => setState(() => testId = v!),
                              items: const [
                                DropdownMenuItem(
                                  value: 'm1',
                                  child: Text('M1'),
                                ),
                                DropdownMenuItem(
                                  value: 'm2',
                                  child: Text('M2'),
                                ),
                                DropdownMenuItem(
                                  value: 'lectora',
                                  child: Text('Lectora / Reading'),
                                ),
                                DropdownMenuItem(
                                  value: 'cien',
                                  child: Text('Ciencias / Science'),
                                ),
                                DropdownMenuItem(
                                  value: 'hist',
                                  child: Text('Historia / History'),
                                ),
                              ],
                            ),
                          const SizedBox(height: 20),
                          FilledButton(
                            onPressed: busy ? null : () => choose(plan.id),
                            child: Text(
                              busy
                                  ? tr(context, 'Guardando…', 'Saving…')
                                  : tr(
                                      context,
                                      'Simular selección',
                                      'Simulate selection',
                                    ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              TextButton(
                onPressed: () => context.go('/home'),
                child: Text(tr(context, 'Volver a Inicio', 'Back to Home')),
              ),
            ],
          ),
        ),
  );
}

