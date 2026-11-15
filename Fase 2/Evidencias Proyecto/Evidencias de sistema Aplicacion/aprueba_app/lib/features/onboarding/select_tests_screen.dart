import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/utils/tier_names.dart';
import '../../core/l10n/l10n.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/wf_colors.dart';
import '../../data/practice_models.dart';
import '../auth/auth_providers.dart';
import '../practice/practice_providers.dart';
import '../practice/practice_repository.dart';
import 'select_format_screen.dart';

/// Paso 3: "¿Qué pruebas quieres practicar?". Al continuar abre la pantalla de formato.
class SelectTestsScreen extends ConsumerStatefulWidget {
  const SelectTestsScreen({super.key, this.fromSettings = false});

  final bool fromSettings;

  @override
  ConsumerState<SelectTestsScreen> createState() => _SelectTestsScreenState();
}

class _SelectTestsScreenState extends ConsumerState<SelectTestsScreen> {
  static const _amarillo = Color(0xFFF5AF41);

  bool _loading = true;
  String? _error;
  List<PracticeTest> _tests = [];
  final Set<String> _selected = {};
  String _difficulty = 'd1';
  String _format = 'random';
  bool _paid = false;

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
      try {
        final profile = await ref.read(profileProvider.future);
        _paid = profile.plan == 'uni' || profile.plan == 'all';
      } catch (_) {}
      if (!mounted) return;
      setState(() {
        _tests = tests;
        _selected
          ..clear()
          ..addAll((prefs?.selectedTests ?? const <String>[])
              .where((id) => tests.any((t) => t.id == id)));
        _difficulty = prefs?.difficulty ?? 'd1';
        _format = prefs?.format ?? 'random';
      });
    } on PracticeException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _next() async {
    if (_selected.isEmpty) return;
    final saved = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => SelectFormatScreen(
          selectedTests: _selected.toList(),
          initialFormat: _format,
          initialDifficulty: _difficulty,
          paid: _paid,
        ),
      ),
    );
    if (saved == true && mounted) {
      if (widget.fromSettings) {
        context.pop();
      } else {
        context.go('/home');
      }
    }
  }

  Widget _chip(PracticeTest t) {
    final c = WfColors.of(context);
    final on = _selected.contains(t.id);

    return InkWell(
      borderRadius: BorderRadius.circular(22),
      onTap: () => setState(() {
        if (on) {
          _selected.remove(t.id);
        } else {
          _selected.add(t.id);
        }
      }),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: on ? c.brand : c.chip,
          borderRadius: BorderRadius.circular(22),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 9,
              height: 9,
              decoration: BoxDecoration(color: t.color, shape: BoxShape.circle),
            ),
            const SizedBox(width: 8),
            Text(
              testName(context, t.id, t.label),
              style: GoogleFonts.inter(
                fontSize: 13,
                fontWeight: FontWeight.w700,
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

  @override
  Widget build(BuildContext context) {
    final c = WfColors.of(context);

    return Scaffold(
      appBar: widget.fromSettings
          ? AppBar(title: Text(tr(context, 'Mis pruebas', 'My tests')))
          : null,
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : Column(
                children: [
                  Expanded(
                    child: ListView(
                      padding: const EdgeInsets.fromLTRB(22, 22, 22, 16),
                      children: [
                        Text(
                          tr(context, '¿Qué pruebas quieres practicar?',
                              'Which tests do you want to practice?'),
                          style: GoogleFonts.montserrat(
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                            color: c.ink,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          tr(
                              context,
                              'Recibirás preguntas solo de las pruebas que elijas. Puedes cambiarlas cuando quieras.',
                              'You will only get questions from the tests you choose. You can change them anytime.'),
                          style: GoogleFonts.inter(fontSize: 14, color: c.muted),
                        ),
                        const SizedBox(height: 18),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [for (final t in _tests) _chip(t)],
                        ),
                        const SizedBox(height: 14),
                        Text(
                          tr(
                              context,
                              'La PAES pondera varias pruebas: la mayoría elige 2 o más.',
                              'The PAES weighs several tests: most students choose 2 or more.'),
                          style: GoogleFonts.inter(fontSize: 12, color: c.muted),
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
                          disabledBackgroundColor:
                              _amarillo.withValues(alpha: 0.4),
                          disabledForegroundColor:
                              AppColors.azul.withValues(alpha: 0.5),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16)),
                          textStyle: GoogleFonts.montserrat(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        onPressed: _selected.isEmpty ? null : _next,
                        child: Text(tr(context, 'Continuar', 'Continue')),
                      ),
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}