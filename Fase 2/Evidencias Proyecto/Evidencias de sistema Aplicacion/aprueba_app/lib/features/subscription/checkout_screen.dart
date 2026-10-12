import 'package:flutter/material.dart';

import '../../core/l10n/l10n.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/wf_colors.dart';
import '../../data/plan_models.dart';
import '../auth/auth_providers.dart';
import 'subscription_providers.dart';
import 'subscription_repository.dart';

class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key, required this.planId, required this.cycle});

  final String planId;
  final String cycle; // monthly | yearly

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  bool _paying = false;
  // Una sola clave por pantalla: reintentar el pago no crea una segunda sesión.
  final String _idempotencyKey = 'ck-${DateTime.now().microsecondsSinceEpoch}';
  String? _error;

  Future<void> _pay() async {
    if (_paying) return;
    setState(() {
      _paying = true;
      _error = null;
    });
    try {
      final repo = ref.read(subscriptionRepositoryProvider);
      final current = ref.read(profileProvider).value?.plan ?? 'free';
      if (current != 'free') {
        // Ya tiene un plan de pago: se cambia sobre la suscripción vigente (prorrateo simulado).
        await repo.change(plan: widget.planId, cycle: widget.cycle);
      } else {
        await repo.checkout(widget.planId, widget.cycle, _idempotencyKey);
      }
      await ref.read(profileProvider.notifier).refresh();
      if (mounted) {
        context.go(
          '/payment-success?plan=${widget.planId}&cycle=${widget.cycle}',
        );
      }
    } on SubscriptionException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _paying = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final plansAsync = ref.watch(plansProvider);
    final c = WfColors.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(tr(context, 'Confirmar y pagar', 'Confirm and pay')),
        leading: BackButton(onPressed: () => context.pop()),
      ),
      body: plansAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Text(
            e is SubscriptionException
                ? e.message
                : tr(
                    context,
                    'No se pudo cargar el plan.',
                    'Could not load the plan.',
                  ),
            style: TextStyle(color: c.danger),
          ),
        ),
        data: (plans) {
          final match = plans.where((p) => p.id == widget.planId);
          if (match.isEmpty) {
            return Center(
              child: Text(
                tr(
                  context,
                  'El plan seleccionado no existe.',
                  'The selected plan does not exist.',
                ),
              ),
            );
          }
          return _content(context, match.first);
        },
      ),
    );
  }

  Widget _label(String text, WfColors c) => Padding(
    padding: const EdgeInsets.only(top: 14, bottom: 4),
    child: Text(
      text.toUpperCase(),
      style: GoogleFonts.montserrat(
        fontSize: 10,
        fontWeight: FontWeight.w700,
        letterSpacing: 0.8,
        color: c.muted,
      ),
    ),
  );

  Widget _payButton({required Widget child, required Color bg, Color? border}) {
    return Padding(
      padding: const EdgeInsets.only(top: 9),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: _paying ? null : _pay,
        child: Ink(
          padding: const EdgeInsets.symmetric(vertical: 13),
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.circular(12),
            border: border == null
                ? null
                : Border.all(color: border, width: 1.5),
          ),
          child: Center(child: child),
        ),
      ),
    );
  }

  Widget _content(BuildContext context, Plan plan) {
    final c = WfColors.of(context);
    final profile = ref.watch(profileProvider).value;
    final yearly = widget.cycle == 'yearly';
    final total = plan.priceLabel(widget.cycle);

    Widget demoField(String hint, String value, {Key? key}) => Padding(
      padding: const EdgeInsets.only(top: 9),
      child: TextFormField(
        key: key,
        initialValue: value,
        readOnly: true,
        decoration: InputDecoration(hintText: hint),
      ),
    );

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
      children: [
        _label(tr(context, 'Resumen', 'Summary'), c),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(13),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text('Plan', style: GoogleFonts.inter(fontSize: 14)),
                    const Spacer(),
                    Text(
                      plan.name,
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
                Divider(color: c.line, height: 22),
                Row(
                  children: [
                    Text('Ciclo', style: GoogleFonts.inter(fontSize: 14)),
                    const Spacer(),
                    Text(
                      yearly
                          ? tr(
                              context,
                              'Anual · 2 meses gratis',
                              'Yearly · 2 months free',
                            )
                          : tr(context, 'Mensual', 'Monthly'),
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
                Divider(color: c.line, height: 22),
                Row(
                  children: [
                    Text(
                      tr(context, 'Total a pagar', 'Total to pay'),
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const Spacer(),
                    Text(
                      total,
                      style: GoogleFonts.montserrat(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: c.brand,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  yearly
                      ? tr(
                          context,
                          'Se cobra una vez al año. Cancela cuando quieras.',
                          'Charged once a year. Cancel anytime.',
                        )
                      : tr(
                          context,
                          'Se cobra cada mes. Cancela cuando quieras.',
                          'Charged every month. Cancel anytime.',
                        ),
                  style: GoogleFonts.inter(fontSize: 11, color: c.muted),
                ),
              ],
            ),
          ),
        ),
        _label(tr(context, 'Pago rápido', 'Quick pay'), c),
        _payButton(
          bg: Colors.black,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.apple, color: Colors.white, size: 20),
              const SizedBox(width: 4),
              Text(
                'Pay',
                style: GoogleFonts.inter(
                  color: Colors.white,
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
        _payButton(
          bg: Colors.white,
          border: c.line,
          child: Text.rich(
            TextSpan(
              style: GoogleFonts.inter(
                fontSize: 15,
                fontWeight: FontWeight.w700,
              ),
              children: const [
                TextSpan(
                  text: 'G',
                  style: TextStyle(color: Color(0xFF4285F4)),
                ),
                TextSpan(
                  text: 'o',
                  style: TextStyle(color: Color(0xFFEA4335)),
                ),
                TextSpan(
                  text: 'o',
                  style: TextStyle(color: Color(0xFFFBBC05)),
                ),
                TextSpan(
                  text: 'g',
                  style: TextStyle(color: Color(0xFF4285F4)),
                ),
                TextSpan(
                  text: 'l',
                  style: TextStyle(color: Color(0xFF34A853)),
                ),
                TextSpan(
                  text: 'e',
                  style: TextStyle(color: Color(0xFFEA4335)),
                ),
                TextSpan(
                  text: ' Pay',
                  style: TextStyle(color: Color(0xFF3C4043)),
                ),
              ],
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.only(top: 16),
          child: Row(
            children: [
              Expanded(child: Divider(color: c.line)),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 10),
                child: Text(
                  tr(context, 'O PAGA CON TARJETA', 'OR PAY WITH CARD'),
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: c.muted,
                  ),
                ),
              ),
              Expanded(child: Divider(color: c.line)),
            ],
          ),
        ),
        // Campos de demostración: solo lectura, nunca se envían.
        demoField('Número de tarjeta', '4242 4242 4242 4242'),
        Row(
          children: [
            Expanded(child: demoField('MM / AA', '12 / 28')),
            const SizedBox(width: 8),
            Expanded(child: demoField('CVC', '123')),
          ],
        ),
        demoField(
          tr(context, 'Nombre en la tarjeta', 'Name on card'),
          profile?.name ?? '',
          key: ValueKey('n-${profile?.name}'),
        ),
        demoField(
          tr(context, 'Correo para el recibo', 'Email for the receipt'),
          profile?.email ?? '',
          key: ValueKey('e-${profile?.email}'),
        ),
        if (_error != null) ...[
          const SizedBox(height: 10),
          Text(_error!, style: TextStyle(color: c.danger)),
        ],
        const SizedBox(height: 14),
        FilledButton(
          onPressed: _paying ? null : _pay,
          child: _paying
              ? const SizedBox(
                  height: 20,
                  width: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: AppColors.azul,
                  ),
                )
              : Text('Pagar $total'),
        ),
        const SizedBox(height: 12),
        Text(
          tr(
            context,
            '🔒 Modo demostración: no se realiza ningún cobro real y los datos de la tarjeta no se envían ni se guardan.',
            '🔒 Demo mode: no real charge is made and card details are neither sent nor stored.',
          ),
          textAlign: TextAlign.center,
          style: GoogleFonts.inter(fontSize: 11, color: c.muted, height: 1.4),
        ),
      ],
    );
  }
}
