import '../../core/widgets/content_skeleton.dart';
import '../../data/plan_models.dart';
import 'subscription_providers.dart';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/l10n/l10n.dart';
import '../../core/network/api_client.dart';
import '../../core/storage/pending_operation.dart';
import '../../core/theme/wf_colors.dart';
import '../auth/auth_providers.dart';

class PlansScreen extends ConsumerStatefulWidget {
  const PlansScreen({super.key, this.limitReached = false});
  final bool limitReached;
  @override
  ConsumerState<PlansScreen> createState() => _PlansState();
}

class _PlansState extends ConsumerState<PlansScreen>
    with WidgetsBindingObserver {
  static const _amarillo = Color(0xFFF5AF41);
  static const _azul = Color(0xFF1A365D);

  String testId = 'm1';
  bool busy = false;
  String? message;

  bool get sandbox =>
      ref
          .read(plansProvider)
          .value
          ?.any((p) => p.paymentMode == 'paypal-sandbox') ==
      true;
  Map<String, dynamic>? subscription;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    Future.microtask(() async {
      try {
        final plans = await ref.read(plansProvider.future);
        if (mounted && plans.any((p) => p.paymentMode == 'paypal-sandbox')) {
          await checkPayment();
        }
      } catch (_) {
        /* The plans provider displays loading errors. */
      }
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && sandbox && !busy) checkPayment();
  }

  Future<void> checkPayment() async {
    if (busy || !mounted) return;
    setState(() => busy = true);
    try {
      final res = await ApiClient.dio.get('/plans/paypal');
      final data = res.data['data'] as Map;
      await ref.read(profileProvider.notifier).refresh();
      if (!mounted) return;
      setState(() {
        subscription = data['subscription'] == null
            ? null
            : Map<String, dynamic>.from(data['subscription'] as Map);
        final user = data['user'] as Map;
        message =
            user['paymentMode'] == 'paypal-sandbox' &&
                user['planStatus'] == 'active'
            ? tr(
                context,
                'Pago de prueba confirmado. Tu plan está habilitado.',
                'Test payment confirmed. Your plan is enabled.',
              )
            : tr(
                context,
                'Todavía no hay un pago completado confirmado.',
                'No completed payment confirmed yet.',
              );
      });
    } catch (_) {
      if (mounted) {
        setState(
          () => message = tr(
            context,
            'No se pudo comprobar el pago. Reintenta.',
            'Could not check payment. Retry.',
          ),
        );
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> openApproval(String value) async {
    final url = Uri.parse(value);
    if (url.scheme != 'https' || url.host != 'www.sandbox.paypal.com') {
      throw StateError('Invalid sandbox URL');
    }
    if (!await launchUrl(
      url,
      mode: LaunchMode.externalApplication,
      webOnlyWindowName: '_self',
    )) {
      throw StateError('Could not open PayPal');
    }
  }

  Future<void> choose(String plan) async {
    if (busy) return;
    setState(() => busy = true);
    try {
      if (sandbox && plan == 'free') {
        await ApiClient.dio.post('/plans/paypal/cancel', data: {});
        await PendingOperation.complete('plan');
        await ref.read(profileProvider.notifier).refresh();
        if (mounted) {
          setState(() {
            subscription = null;
            message = tr(
              context,
              'Renovación cancelada. Conservas el acceso hasta el fin del período confirmado.',
              'Renewal cancelled. Access remains until the end of the confirmed period.',
            );
          });
        }
        return;
      }
      final signature = '$plan:$testId';
      final response = await ApiClient.dio.post(
        sandbox ? '/plans/paypal' : '/plans/subscribe',
        data: {
          'planId': plan,
          'billingCycle': 'monthly',
          if (plan == 'uni') 'testId': testId,
          'requestId': await PendingOperation.id('plan', signature),
        },
      );
      await PendingOperation.complete('plan');
      if (sandbox) {
        final data = response.data['data']['subscription'] as Map;
        if (mounted) {
          setState(() => subscription = Map<String, dynamic>.from(data));
        }
        if (data['approvalUrl'] is String) {
          await openApproval(data['approvalUrl'] as String);
        }
        if (mounted) {
          setState(
            () => message = tr(
              context,
              'Vuelve a Aprueba y comprueba el pago después de completar PayPal Sandbox.',
              'Return to Aprueba and check payment after completing PayPal Sandbox.',
            ),
          );
        }
        return;
      }
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
      if (e is DioException &&
          PendingOperation.definitiveRejection(e) &&
          e.response?.statusCode != 409) {
        await PendingOperation.complete('plan');
      }
      if (mounted) {
        setState(
          () => message = tr(
            context,
            'No se pudo completar la operación. Reintenta la misma selección.',
            'Could not complete the operation. Retry the same selection.',
          ),
        );
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Widget _planCard(Plan plan) {
    final c = WfColors.of(context);
    final all = plan.id == 'all';
    final available = [
      'simulation',
      'paypal-sandbox',
    ].contains(plan.paymentMode);
    final title = plan.id == 'uni'
        ? tr(context, '1 prueba ilimitada', '1 unlimited test')
        : tr(context, 'Todas las pruebas', 'All tests');
    final desc = plan.id == 'uni'
        ? tr(
            context,
            'Preguntas ilimitadas de 1 prueba que elijas',
            'Unlimited questions in 1 test of your choice',
          )
        : tr(
            context,
            'Acceso ilimitado a todas las pruebas PAES, tutores y análisis de falencias',
            'Unlimited access to all PAES tests, tutors and gap analysis',
          );

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: c.chip,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: all ? _azul : c.line, width: all ? 2 : 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  title,
                  style: GoogleFonts.montserrat(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: c.ink,
                  ),
                ),
              ),
              if (all)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFFD1F2E6),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    tr(context, 'Más elegido', 'Most popular'),
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF047857),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),
          if (plan.sandboxAmount != null)
            Text(
              tr(
                context,
                'Pago de prueba: ${plan.sandboxAmount} USD/mes',
                'Test checkout: ${plan.sandboxAmount} USD/month',
              ),
            ),
          Text.rich(
            TextSpan(
              text: formatClp(plan.monthly),
              style: GoogleFonts.montserrat(
                fontSize: 30,
                fontWeight: FontWeight.w800,
                color: _azul,
              ),
              children: [
                TextSpan(
                  text: tr(context, ' /mes', ' /mo'),
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: c.muted,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 6),
          Text(desc, style: GoogleFonts.inter(fontSize: 13, color: c.muted)),
          if (plan.id == 'uni') ...[
            const SizedBox(height: 10),
            DropdownButton<String>(
              isExpanded: true,
              value: testId,
              onChanged: busy ? null : (v) => setState(() => testId = v!),
              items: const [
                DropdownMenuItem(value: 'm1', child: Text('Matemática M1')),
                DropdownMenuItem(value: 'm2', child: Text('Matemática M2')),
                DropdownMenuItem(
                  value: 'lectora',
                  child: Text('Competencia Lectora'),
                ),
                DropdownMenuItem(value: 'cien', child: Text('Ciencias')),
                DropdownMenuItem(
                  value: 'hist',
                  child: Text('Historia y C. Sociales'),
                ),
              ],
            ),
          ],
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            height: 50,
            child: all
                ? FilledButton(
                    style: FilledButton.styleFrom(
                      backgroundColor: _amarillo,
                      foregroundColor: _azul,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                      textStyle: GoogleFonts.montserrat(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    onPressed: busy || !available
                        ? null
                        : () => choose(plan.id),
                    child: Text(
                      busy
                          ? tr(context, 'Guardando…', 'Saving…')
                          : tr(context, 'Elegir plan', 'Choose plan'),
                    ),
                  )
                : OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: _azul,
                      side: BorderSide(color: c.line),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                      textStyle: GoogleFonts.montserrat(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    onPressed: busy || !available
                        ? null
                        : () => choose(plan.id),
                    child: Text(
                      busy
                          ? tr(context, 'Guardando…', 'Saving…')
                          : tr(context, 'Elegir plan', 'Choose plan'),
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = WfColors.of(context);
    return Scaffold(
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
            data: (plans) {
              final paid = plans
                  .where((p) => p.id == 'uni' || p.id == 'all')
                  .toList();
              return ListView(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                children: [
                  Text(
                    tr(
                      context,
                      'DEMOSTRACIÓN DE PAGOS · Sin cobros ni boletas reales.',
                      'PAYMENT DEMO · No charge or real receipts.',
                    ),
                    style: GoogleFonts.inter(fontSize: 11, color: c.muted),
                  ),
                  if (sandbox) ...[
                    Text(
                      tr(
                        context,
                        'PayPal Sandbox: importes ficticios en USD, no son una conversión de CLP.',
                        'PayPal Sandbox: demo USD amounts, not a conversion from CLP.',
                      ),
                    ),
                    OutlinedButton(
                      onPressed: busy ? null : checkPayment,
                      child: Text(
                        tr(
                          context,
                          'Comprobar pago de prueba',
                          'Check test payment',
                        ),
                      ),
                    ),
                    if (subscription?['approvalUrl'] is String)
                      OutlinedButton(
                        onPressed: busy
                            ? null
                            : () async {
                                try {
                                  await openApproval(
                                    subscription!['approvalUrl'] as String,
                                  );
                                } catch (_) {
                                  if (mounted) {
                                    setState(
                                      () => message = tr(
                                        context,
                                        'No se pudo abrir PayPal. Reintenta.',
                                        'Could not open PayPal. Retry.',
                                      ),
                                    );
                                  }
                                }
                              },
                        child: Text(
                          tr(
                            context,
                            'Continuar en PayPal Sandbox',
                            'Continue in PayPal Sandbox',
                          ),
                        ),
                      ),
                  ],
                  if (widget.limitReached) ...[
                    const SizedBox(height: 10),
                    Text(
                      tr(
                        context,
                        'Agotaste tu cuota diaria gratuita.',
                        'You used your free daily quota.',
                      ),
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: c.ink,
                      ),
                    ),
                  ],
                  if (message != null)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      child: Text(
                        message!,
                        style: GoogleFonts.inter(fontSize: 13, color: c.ink),
                      ),
                    ),
                  const SizedBox(height: 14),
                  if (paid.isEmpty)
                    Text(
                      tr(
                        context,
                        'No hay planes disponibles.',
                        'No plans available.',
                      ),
                    ),
                  for (final plan in paid) _planCard(plan),
                  OutlinedButton(
                    onPressed: busy ? null : () => choose('free'),
                    child: Text(
                      tr(
                        context,
                        sandbox
                            ? 'Cancelar renovación de prueba'
                            : 'Volver al plan gratuito (simulado)',
                        sandbox
                            ? 'Cancel test renewal'
                            : 'Return to free plan (demo)',
                      ),
                    ),
                  ),
                  Center(
                    child: TextButton(
                      onPressed: () => context.go('/home'),
                      child: Text(
                        tr(context, 'Quizás más tarde', 'Maybe later'),
                        style: GoogleFonts.montserrat(
                          fontWeight: FontWeight.w800,
                          color: _azul,
                        ),
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
    );
  }
}
