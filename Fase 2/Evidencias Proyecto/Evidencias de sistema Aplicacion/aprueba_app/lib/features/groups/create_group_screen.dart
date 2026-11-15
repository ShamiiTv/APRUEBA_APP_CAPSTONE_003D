import 'package:flutter/material.dart';

import '../../core/utils/tier_names.dart';
import '../../core/utils/test_colors.dart';
import '../../core/l10n/l10n.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/network/api_error.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/wf_colors.dart';
import '../../data/practice_models.dart';
import '../../data/social_models.dart';
import '../practice/practice_providers.dart';
import 'groups_providers.dart';

class CreateGroupScreen extends ConsumerStatefulWidget {
  const CreateGroupScreen({super.key});

  @override
  ConsumerState<CreateGroupScreen> createState() => _CreateGroupScreenState();
}

class _CreateGroupScreenState extends ConsumerState<CreateGroupScreen> {
  static const _amarillo = Color(0xFFF5AF41);
  static const _order = ['lectora', 'm1', 'm2', 'cien', 'hist'];

  final _name = TextEditingController();
  final _description = TextEditingController();
  String? _testId;
  String _visibility = 'private';
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _description.dispose();
    super.dispose();
  }

  List<PracticeTest> _sorted(List<PracticeTest> tests) {
    final list = [...tests];
    int rank(PracticeTest t) {
      final i = _order.indexOf(t.id);
      return i < 0 ? 99 : i;
    }

    list.sort((a, b) => rank(a).compareTo(rank(b)));
    return list;
  }

  Future<void> _create(List<PracticeTest> tests) async {
    final name = _name.text.trim();
    if (name.isEmpty) {
      setState(
        () => _error = tr(
          context,
          'Ingresa un nombre para el grupo.',
          'Enter a name for the group.',
        ),
      );
      return;
    }
    final testId = _testId ?? (tests.isNotEmpty ? tests.first.id : 'm1');
    var color = AppColors.azul;
    for (final t in tests) {
      if (t.id == testId) color = testDotColor(t.id, t.label, t.color);
    }

    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final created = await ref
          .read(groupsRepositoryProvider)
          .create(
            name: name,
            testId: testId,
            colorHex: hexFromColor(color),
            visibility: _visibility,
            description: _description.text.trim(),
          );
      ref.invalidate(groupsProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(tr(context, 'Grupo creado ✓', 'Group created ✓')),
        ),
      );
      context.pushReplacement('/groups/detail', extra: created);
    } on ApiFailure catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Widget _title(String text, {double top = 20}) => Padding(
    padding: EdgeInsets.only(top: top, bottom: 10),
    child: Text(
      text,
      style: GoogleFonts.montserrat(
        fontSize: 11,
        fontWeight: FontWeight.w700,
        letterSpacing: 0.8,
        color: WfColors.of(context).muted,
      ),
    ),
  );

  Widget _visibilityPicker() {
    final c = WfColors.of(context);
    Widget option(String value, String label) {
      final on = _visibility == value;
      return Expanded(
        child: InkWell(
          borderRadius: BorderRadius.circular(11),
          onTap: _saving ? null : () => setState(() => _visibility = value),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 13),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: on ? c.brand : Colors.transparent,
              borderRadius: BorderRadius.circular(11),
            ),
            child: Text(
              label,
              style: GoogleFonts.montserrat(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: on ? Colors.white : c.muted,
              ),
            ),
          ),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: c.chip,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: c.line),
      ),
      child: Row(
        children: [
          option('private', tr(context, 'Privado', 'Private')),
          option('public', tr(context, 'Público', 'Public')),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = WfColors.of(context);
    final tests = _sorted(
      ref.watch(testsProvider).value ?? const <PracticeTest>[],
    );
    final selected = _testId ?? (tests.isNotEmpty ? tests.first.id : null);

    return Scaffold(
      appBar: AppBar(),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(22, 0, 22, 24),
          children: [
            Text(
              tr(context, 'Crear grupo', 'Create group'),
              style: GoogleFonts.montserrat(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: c.ink,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              tr(
                context,
                'Dale un nombre y elige la materia principal de tu grupo.',
                'Give it a name and choose the main subject of your group.',
              ),
              style: GoogleFonts.inter(fontSize: 14, color: c.muted),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _name,
              decoration: InputDecoration(
                hintText: tr(context, 'Nombre del grupo', 'Group name'),
              ),
            ),
            _title(tr(context, 'MATERIA PRINCIPAL', 'MAIN SUBJECT')),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final t in tests)
                  InkWell(
                    borderRadius: BorderRadius.circular(22),
                    onTap: () => setState(() => _testId = t.id),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 9,
                      ),
                      decoration: BoxDecoration(
                        color: selected == t.id ? c.brand : c.chip,
                        borderRadius: BorderRadius.circular(22),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 10,
                            height: 10,
                            decoration: BoxDecoration(
                              color: testDotColor(t.id, t.label, t.color),
                              shape: BoxShape.circle,
                              border: selected == t.id
                                  ? Border.all(color: Colors.white, width: 1.5)
                                  : null,
                            ),
                          ),
                          const SizedBox(width: 7),
                          Text(
                            testName(context, t.id, t.label),
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: selected == t.id ? Colors.white : c.ink,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
            _title(tr(context, 'VISIBILIDAD', 'VISIBILITY')),
            _visibilityPicker(),
            const SizedBox(height: 8),
            Text(
              _visibility == 'private'
                  ? tr(
                      context,
                      'Privado: solo entran quienes reciban invitación.',
                      'Private: only people with an invitation can join.',
                    )
                  : tr(
                      context,
                      'Público: cualquiera puede encontrarlo y unirse.',
                      'Public: anyone can find it and join.',
                    ),
              style: GoogleFonts.inter(fontSize: 12, color: c.muted),
            ),
            _title(tr(context, 'DESCRIPCIÓN (OPCIONAL)', 'DESCRIPTION (OPTIONAL)')),
            TextField(
              controller: _description,
              maxLength: 500,
              decoration: InputDecoration(
                hintText: tr(
                  context,
                  'Cuéntales de qué trata el grupo',
                  'Tell them what the group is about',
                ),
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!, style: TextStyle(color: c.danger)),
            ],
            const SizedBox(height: 20),
            SizedBox(
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
                    fontWeight: FontWeight.w800,
                  ),
                ),
                onPressed: _saving ? null : () => _create(tests),
                child: _saving
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors.azul,
                        ),
                      )
                    : Text(tr(context, 'Crear grupo', 'Create group')),
              ),
            ),
            Center(
              child: TextButton(
                onPressed: _saving ? null : () => context.pop(),
                child: Text(
                  tr(context, 'Cancelar', 'Cancel'),
                  style: GoogleFonts.montserrat(
                    fontWeight: FontWeight.w800,
                    color: AppColors.azul,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}