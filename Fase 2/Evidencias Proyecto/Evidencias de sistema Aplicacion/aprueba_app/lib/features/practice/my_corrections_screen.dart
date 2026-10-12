import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/l10n/l10n.dart';
import '../../core/theme/wf_colors.dart';
import '../../core/widgets/wf_widgets.dart';
import '../../data/practice_models.dart';
import 'practice_providers.dart';

/// Lista de mis solicitudes de recorrección (GET /corrections).
class MyCorrectionsScreen extends ConsumerWidget {
  const MyCorrectionsScreen({super.key});

  String _reason(BuildContext context, String r) => switch (r) {
    'wrong_answer' => tr(context, 'Respuesta incorrecta', 'Wrong answer'),
    'ambiguous' => tr(context, 'Enunciado ambiguo', 'Ambiguous statement'),
    'typo' => tr(context, 'Error de redacción', 'Typo'),
    'bad_explanation' => tr(
      context,
      'Explicación incorrecta',
      'Bad explanation',
    ),
    _ => tr(context, 'Otro motivo', 'Other'),
  };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = WfColors.of(context);
    final async = ref.watch(correctionsProvider);

    Widget statusTag(CorrectionItem i) {
      switch (i.status) {
        case 'confirmed':
          return WfTag(
            text:
                '✔ ${tr(context, 'Confirmada', 'Confirmed')} · +${i.rewardAmount} 🥉',
            bg: c.success.withValues(alpha: 0.15),
            fg: c.success,
          );
        case 'rejected':
          return WfTag(
            text: tr(context, 'Rechazada', 'Rejected'),
            bg: c.danger.withValues(alpha: 0.12),
            fg: c.danger,
          );
        default:
          return WfTag(
            text:
                '⏳ ${tr(context, 'En revisión (48 h)', 'Under review (48 h)')}',
          );
      }
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(tr(context, 'Mis recorrecciones', 'My corrections')),
      ),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  e.toString(),
                  textAlign: TextAlign.center,
                  style: TextStyle(color: c.danger),
                ),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: () => ref.invalidate(correctionsProvider),
                  child: Text(tr(context, 'Reintentar', 'Retry')),
                ),
              ],
            ),
          ),
        ),
        data: (items) {
          if (items.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(28),
                child: Text(
                  tr(
                    context,
                    'Aún no has enviado solicitudes. Puedes pedir una recorrección desde la explicación de cualquier pregunta.',
                    'You have not sent any requests yet. You can request a correction from any question explanation.',
                  ),
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(fontSize: 13, color: c.muted),
                ),
              ),
            );
          }
          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
            children: [
              for (final i in items)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Card(
                    child: Padding(
                      padding: const EdgeInsets.all(13),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _reason(context, i.reason),
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: c.ink,
                            ),
                          ),
                          if (i.comment.isNotEmpty) ...[
                            const SizedBox(height: 3),
                            Text(
                              i.comment,
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                color: c.muted,
                              ),
                            ),
                          ],
                          const SizedBox(height: 8),
                          statusTag(i),
                        ],
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
