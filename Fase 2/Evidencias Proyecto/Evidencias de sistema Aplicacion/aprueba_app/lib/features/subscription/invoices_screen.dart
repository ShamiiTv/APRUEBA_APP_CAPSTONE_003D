import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/l10n/l10n.dart';
import '../../core/theme/wf_colors.dart';
import '../../core/widgets/wf_widgets.dart';
import '../../data/plan_models.dart';
import 'subscription_providers.dart';
import 'subscription_repository.dart';

class InvoicesScreen extends ConsumerWidget {
  const InvoicesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = WfColors.of(context);
    final data = ref.watch(invoicesProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(tr(context, 'Historial de pagos', 'Payment history')),
        leading: BackButton(onPressed: () => context.pop()),
      ),
      body: data.when(
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
                          'No se pudo cargar el historial.',
                          'Could not load the history.',
                        ),
                  textAlign: TextAlign.center,
                  style: TextStyle(color: c.danger),
                ),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: () => ref.invalidate(invoicesProvider),
                  child: Text(tr(context, 'Reintentar', 'Retry')),
                ),
              ],
            ),
          ),
        ),
        data: (list) {
          if (list.isEmpty) {
            return Center(
              child: Text(
                tr(
                  context,
                  'Aún no tienes pagos.',
                  'You have no payments yet.',
                ),
                style: GoogleFonts.inter(fontSize: 13, color: c.muted),
              ),
            );
          }
          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
            children: [
              for (final i in list)
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  decoration: BoxDecoration(
                    border: Border(bottom: BorderSide(color: c.line)),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              i.paidAt ?? '-',
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            Text(
                              i.id,
                              style: GoogleFonts.inter(
                                fontSize: 10,
                                color: c.muted,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Text(
                        formatClp(i.amount),
                        style: GoogleFonts.montserrat(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(width: 8),
                      WfTag(
                        text: i.status == 'paid'
                            ? tr(context, 'Pagado', 'Paid')
                            : i.status,
                        bg: const Color(0x2110B981),
                        fg: const Color(0xFF059669),
                      ),
                    ],
                  ),
                ),
              Padding(
                padding: const EdgeInsets.only(top: 14),
                child: Text(
                  tr(
                    context,
                    'Modo demostración: estos cobros son simulados.',
                    'Demo mode: these charges are simulated.',
                  ),
                  style: GoogleFonts.inter(fontSize: 11, color: c.muted),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
