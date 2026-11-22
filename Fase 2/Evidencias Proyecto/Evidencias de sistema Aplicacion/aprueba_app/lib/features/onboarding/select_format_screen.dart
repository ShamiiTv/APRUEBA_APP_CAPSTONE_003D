import 'package:go_router/go_router.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/l10n/l10n.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/wf_colors.dart';
import '../../data/practice_models.dart';
import '../auth/auth_providers.dart';
import '../practice/practice_providers.dart';
import '../practice/practice_repository.dart';

/// Paso 4: formato de preguntas. Guarda las preferencias y devuelve true al terminar.
/// El nivel de dificultad no se elige: sube automáticamente según los aciertos.
class SelectFormatScreen extends ConsumerStatefulWidget {
  const SelectFormatScreen({
    super.key,
    required this.selectedTests,
    required this.initialFormat,
    required this.initialDifficulty,
    required this.paid,
  });

  final List<String> selectedTests;
  final String initialFormat;
  final String initialDifficulty;
  final bool paid;

  @override
  ConsumerState<SelectFormatScreen> createState() => _SelectFormatScreenState();
}

class _SelectFormatScreenState extends ConsumerState<SelectFormatScreen> {
  static const _amarillo = Color(0xFFF5AF41);

  late String _format;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    // Facsímil has its own persistent setup; onboarding keeps general practice.
    _format = 'random';
  }

  Future<void> _save() async {
    if (_saving) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ref
          .read(practiceRepositoryProvider)
          .savePrefs(
            PracticePrefs(
              selectedTests: widget.selectedTests,
              format: _format,
              difficulty: widget.initialDifficulty,
            ),
          );
      ref.invalidate(profileProvider);
      try {
        await ref.read(profileProvider.future);
      } catch (_) {}
      if (mounted) Navigator.of(context).pop(true);
    } on PracticeException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Widget _infoCard({
    required String title,
    required String text,
    bool premium = false,
    bool selected = false,
  }) {
    final c = WfColors.of(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: c.soft,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: selected ? c.brand : c.line,
          width: selected ? 1.5 : 1,
        ),
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
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: c.ink,
                  ),
                ),
              ),
              if (premium)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFBEBD0),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.lock_outline,
                        size: 14,
                        color: _amarillo,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        tr(context, 'Premium', 'Premium'),
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFFB4730B),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Text(text, style: GoogleFonts.inter(fontSize: 13, color: c.muted)),
        ],
      ),
    );
  }

  Widget _title(String text, {double top = 0}) {
    return Padding(
      padding: EdgeInsets.only(top: top, bottom: 8),
      child: Text(
        text,
        style: GoogleFonts.montserrat(
          fontSize: 20,
          fontWeight: FontWeight.w800,
          color: WfColors.of(context).ink,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = WfColors.of(context);

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(22, 6, 22, 16),
                children: [
                  _title(
                    tr(context, 'Formato de preguntas', 'Question format'),
                  ),
                  const SizedBox(height: 12),
                  _infoCard(
                    title: tr(context, 'Facsímil', 'Mock exam'),
                    text: tr(
                      context,
                      'Configura prueba, dificultad disponible y cantidad de preguntas desde Facsímil. Incluido en el plan Acceso completo.',
                      'Configure a test, available difficulty and question count in Mock exams. Included in Full access.',
                    ),
                    premium: true,
                    selected: _format == 'facsim',
                  ),
                  if (ref.watch(profileProvider).value?.onboardingCompleted ==
                      true)
                    Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: OutlinedButton.icon(
                        onPressed: _saving
                            ? null
                            : () => context.push('/facsimile'),
                        icon: const Icon(Icons.menu_book_outlined),
                        label: Text(
                          tr(context, 'Abrir Facsímil', 'Open mock exams'),
                        ),
                      ),
                    ),
                  _title(
                    tr(context, 'Nivel de dificultad', 'Difficulty level'),
                    top: 26,
                  ),
                  _infoCard(
                    title: tr(
                      context,
                      'Un nivel adecuado para comenzar',
                      'The right level to get started',
                    ),
                    text: tr(
                      context,
                      'Comienzas en el primer nivel que tiene preguntas disponibles. Los siguientes se desbloquean al conseguir 20 aciertos en el nivel anterior.',
                      'Start at the first level with available questions. Further levels unlock after 20 correct answers in the previous level.',
                    ),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 10),
                    Text(_error!, style: TextStyle(color: c.danger)),
                  ],
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(22, 0, 22, 18),
              child: SizedBox(
                width: double.infinity,
                height: 54,
                child: FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: _amarillo,
                    foregroundColor: AppColors.azul,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    textStyle: GoogleFonts.montserrat(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  onPressed: _saving ? null : _save,
                  child: _saving
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AppColors.azul,
                          ),
                        )
                      : Text(tr(context, 'Continuar', 'Continue')),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
