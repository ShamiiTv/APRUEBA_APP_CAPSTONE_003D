import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/l10n/l10n.dart';
import '../../core/theme/wf_colors.dart';

/// Pantalla "Desbloquea los Tutores": se abre cuando un usuario sin plan "all"
/// intenta contactar a un profesor o generar el análisis de falencias.
class PremiumGateScreen extends StatelessWidget {
  const PremiumGateScreen({super.key});

  static const _amarillo = Color(0xFFF5AF41);
  static const _azul = Color(0xFF1A365D);

  @override
  Widget build(BuildContext context) {
    final c = WfColors.of(context);
    final benefits = [
      tr(context, 'Análisis de falencias por asignatura', 'Gap analysis by subject'),
      tr(context, 'Contacto y chat con profesores', 'Contact and chat with teachers'),
      tr(context, 'Ensayos facsímil ilimitados', 'Unlimited mock exams'),
      tr(context, 'Sin límite de preguntas diarias', 'No daily question limit'),
    ];

    return Scaffold(
      appBar: AppBar(),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(22, 0, 22, 24),
          children: [
            const SizedBox(height: 8),
            const Center(child: Text('🔒', style: TextStyle(fontSize: 56))),
            const SizedBox(height: 14),
            Text(
              tr(context, 'Desbloquea los Tutores', 'Unlock Tutors'),
              textAlign: TextAlign.center,
              style: GoogleFonts.montserrat(fontSize: 22, fontWeight: FontWeight.w800, color: c.ink),
            ),
            const SizedBox(height: 8),
            Text(
              tr(
                context,
                'Contactar profesores y el análisis de falencias son parte de Aprueba Premium.',
                'Contacting teachers and gap analysis are part of Aprueba Premium.',
              ),
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(fontSize: 14, color: c.muted, height: 1.4),
            ),
            const SizedBox(height: 18),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: c.chip,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: c.line),
              ),
              child: Column(
                children: [
                  for (final b in benefits)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      child: Row(
                        children: [
                          const Text('✓', style: TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.w900, fontSize: 16)),
                          const SizedBox(width: 10),
                          Expanded(child: Text(b, style: GoogleFonts.inter(fontSize: 13, color: c.ink))),
                        ],
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF6E5),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: _amarillo.withValues(alpha: 0.7)),
              ),
              child: Column(
                children: [
                  Text(tr(context, 'Plan mensual', 'Monthly plan'),
                      style: GoogleFonts.inter(fontSize: 12, color: c.muted)),
                  const SizedBox(height: 4),
                  Text.rich(
                    TextSpan(
                      text: '\$4.990',
                      style: GoogleFonts.montserrat(fontSize: 32, fontWeight: FontWeight.w800, color: _azul),
                      children: [
                        TextSpan(
                          text: tr(context, ' /mes', ' /mo'),
                          style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: c.muted),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    tr(context, 'Demostración: no se realiza ningún cobro real',
                        'Demo: no real charge is made'),
                    style: GoogleFonts.inter(fontSize: 11, color: c.muted),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            SizedBox(
              height: 54,
              child: FilledButton(
                style: FilledButton.styleFrom(
                  backgroundColor: _amarillo,
                  foregroundColor: _azul,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  textStyle: GoogleFonts.montserrat(fontSize: 16, fontWeight: FontWeight.w800),
                ),
                onPressed: () => context.push('/plans'),
                child: Text(tr(context, 'Hazte Premium', 'Go Premium')),
              ),
            ),
            Center(
              child: TextButton(
                onPressed: () => context.pop(),
                child: Text(
                  tr(context, 'Ahora no', 'Not now'),
                  style: GoogleFonts.montserrat(fontWeight: FontWeight.w800, color: _azul),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}