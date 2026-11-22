import '../../core/widgets/section_header.dart';
import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/l10n/l10n.dart';
import '../../core/l10n/system_text.dart';
import '../../core/network/api_client.dart';
import '../../core/storage/pending_operation.dart';
import '../../core/theme/wf_colors.dart';
import '../../core/utils/format_utils.dart';
import '../../core/widgets/content_skeleton.dart';
import '../../core/widgets/loading_geometry.dart';
import '../../data/plan_models.dart';
import '../auth/auth_providers.dart';
import 'subscription_providers.dart';
import 'paypal_window_stub.dart'
    if (dart.library.js_interop) 'paypal_window_web.dart'
    as payment_window;

class PlansScreen extends ConsumerStatefulWidget {
  const PlansScreen({super.key, this.limitReached = false});
  final bool limitReached;
  @override
  ConsumerState<PlansScreen> createState() => _PlansState();
}

class _PlansState extends ConsumerState<PlansScreen>
    with WidgetsBindingObserver {
  String testId = 'm1';
  bool busy = false, checking = false, _dialogOpen = false;
  String? message;
  Map<String, dynamic>? subscription, currentUser;
  Timer? _poll;
  int _attempts = 0;
  final _phase = ValueNotifier<String>('opening');
  String? _paymentError;
  bool get sandbox =>
      ref
          .read(plansProvider)
          .value
          ?.any((p) => p.paymentMode == 'paypal-sandbox') ==
      true;
  DateTime? get periodEnd => parseApiDate(currentUser?['currentPeriodEnd']);
  bool get active =>
      currentUser?['plan'] != 'free' &&
      periodEnd?.isAfter(DateTime.now()) == true;
  String get endLabel => periodEnd == null
      ? ''
      : MaterialLocalizations.of(context).formatFullDate(periodEnd!);
  String planName(String id) => id == 'all'
      ? tr(context, 'Todas las pruebas', 'All tests')
      : id == 'uni'
      ? tr(context, '1 prueba ilimitada', '1 unlimited test')
      : tr(context, 'Plan gratuito', 'Free plan');

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    Future.microtask(() async {
      try {
        final plans = await ref.read(plansProvider.future);
        if (mounted && plans.any((p) => p.paymentMode == 'paypal-sandbox')) {
          final cached = ref.read(profileProvider).value;
          if (cached != null) {
            setState(
              () => currentUser = {
                'plan': cached.plan,
                'currentPeriodEnd': cached.currentPeriodEnd?.toIso8601String(),
              },
            );
          }
          await checkPayment();
        }
      } catch (_) {}
    });
  }

  @override
  void dispose() {
    _poll?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    _phase.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && sandbox && !busy) {
      checkPayment(quiet: true);
    }
  }

  Future<void> checkPayment({bool quiet = false}) async {
    if (checking || !mounted) return;
    setState(() => checking = true);
    try {
      final response = await ApiClient.dio.get('/plans/paypal');
      final data = response.data['data'] as Map;
      final nextUser = Map<String, dynamic>.from(data['user'] as Map);
      final changed =
          currentUser?['plan'] != nextUser['plan'] ||
          currentUser?['planStatus'] != nextUser['planStatus'];
      if (changed) {
        await ref.read(profileProvider.notifier).refresh();
      }
      if (!mounted) return;
      setState(() {
        subscription = data['subscription'] == null
            ? null
            : Map<String, dynamic>.from(data['subscription'] as Map);
        currentUser = nextUser;
      });
      if (_dialogOpen &&
          nextUser['planStatus'] == 'active' &&
          nextUser['paymentMode'] == 'paypal-sandbox' &&
          active) {
        _poll?.cancel();
        payment_window.close();
        _phase.value = 'confirmed';
      }
    } catch (_) {
      if (mounted && !quiet) {
        setState(
          () => message = tr(
            context,
            'No se pudo actualizar la suscripción. Reintenta.',
            'Could not refresh your subscription. Please retry.',
          ),
        );
      }
    } finally {
      if (mounted) setState(() => checking = false);
    }
  }

  void startPolling() {
    _attempts = 0;
    _poll?.cancel();
    _poll = Timer.periodic(const Duration(seconds: 5), (_) {
      if (!_dialogOpen) {
        _poll?.cancel();
        return;
      }
      if (++_attempts > 18) {
        _poll?.cancel();
        _phase.value = 'pending';
        return;
      }
      checkPayment(quiet: true);
    });
  }

  void showProgress() {
    _phase.value = 'opening';
    _dialogOpen = true;
    unawaited(
      showDialog<void>(
        context: context,
        barrierDismissible: false,
        builder: (dialogContext) => ValueListenableBuilder<String>(
          valueListenable: _phase,
          builder: (context, phase, _) {
            final waiting = phase == 'opening' || phase == 'waiting';
            return AlertDialog(
              icon: Icon(
                phase == 'confirmed'
                    ? Icons.check_circle_outline
                    : Icons.lock_outline,
                size: 42,
                color: phase == 'confirmed'
                    ? Colors.green
                    : Theme.of(context).colorScheme.primary,
              ),
              title: Text(
                phase == 'confirmed'
                    ? tr(context, 'Tu plan está listo', 'Your plan is ready')
                    : phase == 'error'
                    ? tr(
                        context,
                        'No pudimos continuar',
                        'We could not continue',
                      )
                    : tr(
                        context,
                        'Completa tu suscripción',
                        'Complete your subscription',
                      ),
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    phase == 'confirmed'
                        ? tr(
                            context,
                            'Pago confirmado. Ya puedes disfrutar de los beneficios de tu suscripción.',
                            'Payment confirmed. Your subscription benefits are now available.',
                          )
                        : phase == 'error'
                        ? (_paymentError == null
                              ? tr(
                                  context,
                                  'Reintenta la operación.',
                                  'Please try again.',
                                )
                              : systemText(context, _paymentError!))
                        : phase == 'pending'
                        ? tr(
                            context,
                            'La confirmación está tardando más de lo esperado. Puedes consultar el estado de tu plan más tarde.',
                            'Confirmation is taking longer than expected. You can check your plan status later.',
                          )
                        : tr(
                            context,
                            'Completa el pago en PayPal. Tu plan se actualizará automáticamente.',
                            'Complete payment in PayPal. Your plan will update automatically.',
                          ),
                  ),
                  if (waiting) ...[
                    const SizedBox(height: 20),
                    const LinearProgressIndicator(),
                  ],
                  if (phase != 'opening' &&
                      phase != 'confirmed' &&
                      subscription?['approvalUrl'] is String) ...[
                    const SizedBox(height: 16),
                    OutlinedButton(
                      onPressed: () =>
                          openApproval(subscription!['approvalUrl'] as String),
                      child: Text(tr(context, 'Abrir PayPal', 'Open PayPal')),
                    ),
                  ],
                ],
              ),
              actions: [
                TextButton(
                  onPressed: phase == 'opening'
                      ? null
                      : () => Navigator.of(dialogContext).pop(),
                  child: Text(
                    phase == 'confirmed'
                        ? tr(
                            context,
                            'Continuar estudiando',
                            'Continue studying',
                          )
                        : tr(context, 'Cerrar panel', 'Close panel'),
                  ),
                ),
              ],
            );
          },
        ),
      ).whenComplete(() {
        _dialogOpen = false;
        _poll?.cancel();
        payment_window.close();
      }),
    );
  }

  Future<void> openApproval(String value) async {
    final uri = Uri.parse(value);
    if (uri.scheme != 'https' || uri.host != 'www.sandbox.paypal.com') {
      throw StateError('Invalid payment URL');
    }
    if (kIsWeb) {
      if (!payment_window.navigate(value) && !payment_window.open(value)) {
        if (mounted) {
          setState(
            () => message = tr(
              context,
              'Permite la ventana emergente para continuar con PayPal.',
              'Allow the popup window to continue with PayPal.',
            ),
          );
        }
      }
      return;
    }
    if (!await launchUrl(uri, mode: LaunchMode.inAppBrowserView)) {
      throw StateError('Could not open payment');
    }
  }

  Future<void> choose(String plan) async {
    if (busy) return;
    if (kIsWeb && sandbox) payment_window.prepare();
    setState(() => busy = true);
    showProgress();
    try {
      final response = await ApiClient.dio.post(
        sandbox ? '/plans/paypal' : '/plans/subscribe',
        data: {
          'planId': plan,
          'billingCycle': 'monthly',
          if (plan == 'uni') 'testId': testId,
          'requestId': await PendingOperation.id('plan', '$plan:$testId'),
        },
      );
      await PendingOperation.complete('plan');
      if (!mounted) return;
      if (sandbox) {
        setState(
          () => subscription = Map<String, dynamic>.from(
            response.data['data']['subscription'] as Map,
          ),
        );
        _phase.value = 'waiting';
        if (subscription?['approvalUrl'] is String) {
          await openApproval(subscription!['approvalUrl'] as String);
          startPolling();
        }
        await checkPayment(quiet: true);
      } else {
        await ref.read(profileProvider.notifier).refresh();
        _phase.value = 'confirmed';
      }
    } catch (error) {
      if (error is DioException &&
          PendingOperation.definitiveRejection(error) &&
          error.response?.statusCode != 409) {
        await PendingOperation.complete('plan');
      }
      if (mounted) {
        _paymentError = error is DioException
            ? error.response?.data?['error']?['message']?.toString()
            : null;
        _phase.value = 'error';
        payment_window.close();
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> cancelRenewal() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(tr(context, '¿Cancelar la renovación?', 'Cancel renewal?')),
        content: Text(
          active
              ? tr(
                  context,
                  'No habrá nuevas renovaciones. Mantendrás el acceso hasta el $endLabel.',
                  'There will be no further renewals. You keep access until $endLabel.',
                )
              : tr(
                  context,
                  'Se cancelará tu solicitud de pago pendiente.',
                  'Your pending payment request will be cancelled.',
                ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(
              tr(context, 'Mantener suscripción', 'Keep subscription'),
            ),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(
              tr(context, 'Confirmar cancelación', 'Confirm cancellation'),
            ),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    setState(() => busy = true);
    try {
      final result = await ApiClient.dio.post('/plans/paypal/cancel', data: {});
      await PendingOperation.complete('plan');
      await ref.read(profileProvider.notifier).refresh();
      if (mounted) {
        final data = result.data['data'] as Map;
        setState(() {
          subscription = data['subscription'] == null
              ? null
              : Map<String, dynamic>.from(data['subscription'] as Map);
          currentUser = Map<String, dynamic>.from(data['user'] as Map);
          message = data['abandoned'] == true
              ? tr(
                  context,
                  'Solicitud pendiente cancelada.',
                  'Pending request cancelled.',
                )
              : tr(
                  context,
                  'Renovación cancelada. Conservas el acceso hasta el vencimiento de tu período actual.',
                  'Renewal cancelled. You keep access until your current period ends.',
                );
        });
      }
    } catch (_) {
      if (mounted) {
        setState(
          () => message = tr(
            context,
            'No se pudo cancelar la renovación. Reintenta.',
            'Could not cancel renewal. Please retry.',
          ),
        );
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Widget planCard(Plan plan) {
    final c = WfColors.of(context),
        current = plan.id == (active ? currentUser!['plan'] : 'free');
    final locked =
        subscription != null &&
        (active ||
            !['CANCELLED', 'EXPIRED'].contains(subscription?['status'])) &&
        subscription?['approvalUrl'] == null &&
        !current;
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: c.bg,
        border: Border.all(
          color: plan.id == 'all' ? const Color(0xFFF5AF41) : c.line,
          width: plan.id == 'all' ? 2 : 1,
        ),
        borderRadius: BorderRadius.circular(20),
      ),
      child: ConstrainedBox(
        constraints: BoxConstraints(
          minHeight: LoadingGeometry.planHeight(context, plan.id) - 44,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      plan.id == 'all'
                          ? Icons.workspace_premium_outlined
                          : plan.id == 'uni'
                          ? Icons.track_changes
                          : Icons.auto_awesome_outlined,
                      color: c.brand,
                    ),
                    const Spacer(),
                    if (plan.id == 'all')
                      Text(
                        tr(context, 'Más completo', 'Most complete'),
                        style: TextStyle(color: c.muted, fontSize: 12),
                      ),
                  ],
                ),
                const SizedBox(height: 18),
                Text(
                  planName(plan.id),
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: c.ink,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  '${formatClp(plan.monthly)} CLP / ${tr(context, 'mes', 'month')}',
                  style: TextStyle(
                    fontSize: 25,
                    fontWeight: FontWeight.w800,
                    color: c.ink,
                  ),
                ),
                if (plan.sandboxAmount != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    '${tr(context, 'Pago en PayPal', 'PayPal payment')}: US\$ ${plan.sandboxAmount} / ${tr(context, 'mes', 'month')}',
                    style: TextStyle(fontSize: 12, color: c.muted),
                  ),
                ],
                const SizedBox(height: 20),
                Text(
                  plan.id == 'free'
                      ? tr(
                          context,
                          'Hasta 20 preguntas al día',
                          'Up to 20 questions a day',
                        )
                      : plan.id == 'uni'
                      ? tr(
                          context,
                          'Práctica ilimitada en la prueba que elijas',
                          'Unlimited practice in your chosen test',
                        )
                      : tr(
                          context,
                          'Todas las pruebas PAES, tutores y análisis de debilidades',
                          'All PAES tests, tutors and weakness analysis',
                        ),
                  style: TextStyle(height: 1.7, color: c.ink),
                ),
                const SizedBox(height: 8),
                Text(
                  tr(
                    context,
                    'Progreso y plan de estudio',
                    'Progress and study plan',
                  ),
                  style: TextStyle(height: 1.7, color: c.muted),
                ),
                if (plan.id == 'uni') ...[
                  const SizedBox(height: 18),
                  DropdownButtonFormField<String>(
                    initialValue: testId,
                    isExpanded: true,
                    decoration: InputDecoration(
                      labelText: tr(
                        context,
                        'Elige tu prueba',
                        'Choose your test',
                      ),
                    ),
                    items: [
                      for (final id in ['m1', 'm2', 'lectora', 'cien', 'hist'])
                        DropdownMenuItem(
                          value: id,
                          child: Text(
                            {
                              'm1': tr(
                                context,
                                'Matemática M1',
                                'Mathematics M1',
                              ),
                              'm2': tr(
                                context,
                                'Matemática M2',
                                'Mathematics M2',
                              ),
                              'lectora': tr(
                                context,
                                'Competencia Lectora',
                                'Reading Comprehension',
                              ),
                              'cien': tr(context, 'Ciencias', 'Science'),
                              'hist': tr(context, 'Historia', 'History'),
                            }[id]!,
                          ),
                        ),
                    ],
                    onChanged: busy || current
                        ? null
                        : (value) {
                            if (value != null) setState(() => testId = value);
                          },
                  ),
                ],
              ],
            ),
            Padding(
              padding: const EdgeInsets.only(top: 22),
              child: FilledButton(
                onPressed:
                    busy ||
                        current ||
                        plan.id == 'free' ||
                        locked ||
                        ![
                          'simulation',
                          'paypal-sandbox',
                        ].contains(plan.paymentMode)
                    ? null
                    : () => choose(plan.id),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Text(
                    current
                        ? tr(context, 'Plan actual', 'Current plan')
                        : locked
                        ? tr(
                            context,
                            'Disponible al finalizar tu plan',
                            'Available after your current plan',
                          )
                        : tr(
                            context,
                            'Suscribirme con PayPal',
                            'Subscribe with PayPal',
                          ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = WfColors.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(tr(context, 'Suscripción', 'Subscription'))),
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
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
              children: [
                SectionHeader(tr(context, 'Estudia a tu ritmo', 'Study at your own pace'), Icons.credit_card_rounded),
                const SizedBox(height: 10),
                Text(
                  tr(
                    context,
                    'Elige el apoyo que necesitas para preparar la PAES.',
                    'Choose the support you need to prepare for PAES.',
                  ),
                  style: TextStyle(color: c.muted, height: 1.6),
                ),
                Container(
                  margin: const EdgeInsets.symmetric(vertical: 22),
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: c.chip,
                    border: Border.all(color: c.line),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        active
                            ? tr(context, 'Tu plan activo', 'Your active plan')
                            : tr(context, 'Tu plan', 'Your plan'),
                        style: TextStyle(fontSize: 12, color: c.muted),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        planName(
                          active ? currentUser!['plan'] as String : 'free',
                        ),
                        style: TextStyle(
                          fontSize: 21,
                          fontWeight: FontWeight.w800,
                          color: c.ink,
                        ),
                      ),
                      if (active) ...[
                        const SizedBox(height: 10),
                        Text(
                          '${['CANCELLED', 'EXPIRED'].contains(subscription?['status']) ? tr(context, 'Acceso hasta el', 'Access until') : tr(context, 'Próxima renovación:', 'Next renewal:')} $endLabel',
                          style: TextStyle(color: c.muted, fontSize: 12),
                        ),
                      ],
                      const SizedBox(height: 14),
                      Text(
                        tr(
                          context,
                          'Suscripción mensual. Puedes cancelar la renovación cuando quieras y conservarás el acceso hasta el vencimiento del período pagado.',
                          'Monthly subscription. Cancel renewal at any time and keep access until your paid period ends.',
                        ),
                        style: TextStyle(
                          color: c.muted,
                          fontSize: 12,
                          height: 1.7,
                        ),
                      ),
                      if (checking) ...[
                        const SizedBox(height: 12),
                        const LinearProgressIndicator(),
                      ],
                      if (subscription?['approvalUrl'] is String)
                        TextButton(
                          onPressed: busy
                              ? null
                              : () {
                                  if (kIsWeb) payment_window.prepare();
                                  showProgress();
                                  _phase.value = 'waiting';
                                  openApproval(
                                    subscription!['approvalUrl'] as String,
                                  );
                                  startPolling();
                                },
                          child: Text(
                            tr(context, 'Continuar pago', 'Continue payment'),
                          ),
                        ),
                      if (subscription != null &&
                          ![
                            'CANCELLED',
                            'EXPIRED',
                          ].contains(subscription?['status']))
                        TextButton(
                          onPressed: busy ? null : cancelRenewal,
                          child: Text(
                            subscription?['approvalUrl'] is String
                                ? tr(
                                    context,
                                    'Cancelar solicitud',
                                    'Cancel request',
                                  )
                                : tr(
                                    context,
                                    'Cancelar renovación',
                                    'Cancel renewal',
                                  ),
                          ),
                        ),
                      if (sandbox)
                        TextButton(
                          onPressed: checking ? null : () => checkPayment(),
                          child: Text(
                            tr(context, 'Actualizar estado', 'Refresh status'),
                          ),
                        ),
                    ],
                  ),
                ),
                if (widget.limitReached)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: Text(
                      tr(
                        context,
                        'Agotaste tu cuota diaria gratuita.',
                        'You used your free daily quota.',
                      ),
                      style: TextStyle(color: c.ink),
                    ),
                  ),
                if (message != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: Text(
                      message!,
                      style: TextStyle(color: c.ink, height: 1.6),
                    ),
                  ),
                for (final plan in plans) planCard(plan),
                Text(
                  tr(
                    context,
                    'Facsímil en orden fijo, incluido en Acceso completo.',
                    'Fixed-order mock exams are included in Full access.',
                  ),
                  style: TextStyle(color: c.muted, fontSize: 12, height: 1.6),
                ),
              ],
            ),
          ),
    );
  }
}
