import 'package:flutter/material.dart';

import '../../core/utils/tier_names.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/l10n/l10n.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/wf_colors.dart';
import '../../data/practice_models.dart';
import '../auth/auth_providers.dart';
import '../practice/practice_providers.dart';
import '../practice/practice_repository.dart';

/// "¿Qué pruebas quieres practicar?": pruebas, dificultad (d1–d3) y práctica aleatoria.
class SelectTestsScreen extends ConsumerStatefulWidget {
  const SelectTestsScreen({super.key, this.fromSettings = false});

  final bool fromSettings;

  @override
  ConsumerState<SelectTestsScreen> createState() => _SelectTestsScreenState();
}

class _SelectTestsScreenState extends ConsumerState<SelectTestsScreen> {
  bool _loading = true;
  bool _saving = false;
  String? _error;
  List<PracticeTest> _tests = [];
  final Set<String> _selected = {};
  String _difficulty = 'd2';
  String _format = 'random';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final repo = ref.read(practiceRepositoryProvider);
      final tests = await repo.fetchTests();
      PracticePrefs? prefs;
      try {
        prefs = await repo.fetchPrefs();
      } catch (_) {}
      if (!mounted) return;
      setState(() {
        _tests = tests;
        _selected
          ..clear()
          ..addAll(
            (prefs?.selectedTests ?? const <String>[]).where(
              (id) => tests.any((t) => t.id == id),
            ),
          );
        _difficulty = prefs?.difficulty ?? 'd2';
        _format = 'random';
      });
    } on PracticeException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    if (_selected.isEmpty || _saving) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ref
          .read(practiceRepositoryProvider)
          .savePrefs(
            PracticePrefs(
              selectedTests: _selected.toList(),
              format: _format,
              difficulty: _difficulty,
            ),
          );
      ref.read(profileProvider.notifier).refresh();
      if (!mounted) return;
      if (widget.fromSettings) {
        context.pop();
      } else {
        context.go('/home');
      }
    } on PracticeException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Widget _chip(PracticeTest t) {
    final c = WfColors.of(context);
    final on = _selected.contains(t.id);

    return InkWell(
      borderRadius: BorderRadius.circular(20),
      onTap: () => setState(() {
        if (on) {
          _selected.remove(t.id);
        } else {
          _selected.add(t.id);
        }
      }),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 7),
        decoration: BoxDecoration(
          color: on ? c.brand : c.chip,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 9,
              height: 9,
              decoration: BoxDecoration(color: t.color, shape: BoxShape.circle),
            ),
            const SizedBox(width: 6),
            Text(
              testName(context, t.id, t.label),
              style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: on ? Colors.white : c.ink,
              ),
            ),
            if (!t.hasQuestions) ...[
              const SizedBox(width: 6),
              Text(
                tr(context, '· sin preguntas aún', '· no questions yet'),
                style: GoogleFonts.inter(
                  fontSize: 10,
                  color: on ? Colors.white70 : c.muted,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _choice({
    required String label,
    required bool on,
    required VoidCallback onTap,
  }) {
    final c = WfColors.of(context);
    return InkWell(
      borderRadius: BorderRadius.circular(20),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 7),
        decoration: BoxDecoration(
          color: on ? c.brand : c.chip,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: on ? Colors.white : c.ink,
          ),
        ),
      ),
    );
  }

  Widget _sectionTitle(String text) {
    final c = WfColors.of(context);
    return Padding(
      padding: const EdgeInsets.only(top: 22, bottom: 8),
      child: Text(
        text.toUpperCase(),
        style: GoogleFonts.montserrat(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.6,
          color: c.muted,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = WfColors.of(context);
    final tt = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(
        title: Text(tr(context, 'Mis pruebas', 'My tests')),
        automaticallyImplyLeading: widget.fromSettings,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
              children: [
                Text(
                  tr(
                    context,
                    '¿Qué pruebas quieres practicar?',
                    'Which tests do you want to practice?',
                  ),
                  style: tt.headlineSmall,
                ),
                const SizedBox(height: 4),
                Text(
                  tr(
                    context,
                    'Solo recibirás preguntas de las que elijas.',
                    'You will only get questions from the ones you choose.',
                  ),
                  style: GoogleFonts.inter(fontSize: 13, color: c.muted),
                ),
                const SizedBox(height: 14),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [for (final t in _tests) _chip(t)],
                ),
                const SizedBox(height: 10),
                Text(
                  tr(
                    context,
                    'La PAES pondera varias pruebas: la mayoría elige 2 o más.',
                    'The PAES weighs several tests: most students choose 2 or more.',
                  ),
                  style: GoogleFonts.inter(fontSize: 11, color: c.muted),
                ),
                _sectionTitle(
                  tr(context, 'Nivel de dificultad', 'Difficulty level'),
                ),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final e in kDifficultyLabels.entries)
                      _choice(
                        label: difficultyName(context, e.key) ?? e.value,
                        on: _difficulty == e.key,
                        onTap: () => setState(() => _difficulty = e.key),
                      ),
                  ],
                ),
                _sectionTitle(tr(context, 'Formato', 'Format')),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _choice(
                      label: tr(context, 'Aleatorio', 'Random'),
                      on: _format == 'random',
                      onTap: () => setState(() => _format = 'random'),
                    ),

                  ],
                ),
                if (_error != null) ...[
                  const SizedBox(height: 10),
                  Text(_error!, style: TextStyle(color: c.danger)),
                ],
                const SizedBox(height: 28),
                FilledButton(
                  onPressed: (_selected.isEmpty || _saving) ? null : _save,
                  child: _saving
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AppColors.azul,
                          ),
                        )
                      : Text(
                          widget.fromSettings
                              ? tr(context, 'Guardar', 'Save')
                              : tr(context, 'Continuar', 'Continue'),
                        ),
                ),
              ],
            ),
    );
  }
}
