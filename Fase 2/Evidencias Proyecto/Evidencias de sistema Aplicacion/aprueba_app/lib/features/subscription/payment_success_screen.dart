import 'package:flutter/material.dart';

import '../../core/l10n/l10n.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/theme/wf_colors.dart';
import 'subscription_providers.dart';

class PaymentSuccessScreen extends ConsumerWidget {
  const PaymentSuccessScreen({
    super.key,
    required this.planId,
    required this.cycle,
  });

  final String planId;
  final String cycle;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = WfColors.of(context);
    final tt = Theme.of(context).textTheme;
    final plans = ref.watch(plansProvider).value ?? const [];
    final match = plans.where((p) => p.id == planId);
    final plan = match.isEmpty ? null : match.first;

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              const Spacer(),
              const Text('🎉', style: TextStyle(fontSize: 60)),
              const SizedBox(height: 8),
              Text(
                tr(context, '¡Pago exitoso!', 'Payment successful!'),
                style: tt.headlineSmall?.copyWith(color: c.success),
              ),
              const SizedBox(height: 8),
              Text(
                tr(
                  context,
                  'Tu plan ya está activo. ¡A practicar sin límites!',
                  'Your plan is now active. Time to practice with no limits!',
                ),
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(fontSize: 13, color: c.muted),
              ),
              if (plan != null) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(13),
                  decoration: BoxDecoration(
                    color: c.success.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: c.success, width: 1.5),
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Text(
                            tr(context, 'Plan', 'Plan'),
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              color: c.muted,
                            ),
                          ),
                          const Spacer(),
                          Text(
                            plan.name,
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          Text(
                            tr(context, 'Total', 'Total'),
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              color: c.muted,
                            ),
                          ),
                          const Spacer(),
                          Text(
                            plan.priceLabel(cycle),
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
              const Spacer(),
              FilledButton(
                onPressed: () => context.go('/home'),
                child: Text(
                  tr(context, 'Empezar a practicar', 'Start practicing'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
