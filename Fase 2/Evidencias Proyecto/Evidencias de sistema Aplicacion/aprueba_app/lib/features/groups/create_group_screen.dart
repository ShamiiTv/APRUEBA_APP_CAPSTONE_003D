import 'package:flutter/material.dart';

import '../../core/utils/tier_names.dart';
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
  final _name = TextEditingController();
  String? _testId;
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
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
      if (t.id == testId) color = t.color;
    }

    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ref
          .read(groupsRepositoryProvider)
          .create(name: name, testId: testId, colorHex: hexFromColor(color));
      ref.invalidate(groupsProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(tr(context, 'Grupo creado ✓', 'Group created ✓')),
        ),
      );
      context.pop();
    } on ApiFailure catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = WfColors.of(context);
    final tests = ref.watch(testsProvider).value ?? const <PracticeTest>[];
    final selected = _testId ?? (tests.isNotEmpty ? tests.first.id : null);

    return Scaffold(
      appBar: AppBar(title: Text(tr(context, 'Crear grupo', 'Create group'))),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
        children: [
          Text(
            tr(
              context,
              'Dale un nombre y elige la materia principal.',
              'Give it a name and choose the main subject.',
            ),
            style: GoogleFonts.inter(fontSize: 13, color: c.muted),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _name,
            decoration: InputDecoration(
              hintText: tr(context, 'Nombre del grupo', 'Group name'),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            tr(context, 'MATERIA PRINCIPAL', 'MAIN SUBJECT'),
            style: GoogleFonts.montserrat(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.8,
              color: c.muted,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final t in tests)
                InkWell(
                  borderRadius: BorderRadius.circular(20),
                  onTap: () => setState(() => _testId = t.id),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 13,
                      vertical: 7,
                    ),
                    decoration: BoxDecoration(
                      color: selected == t.id ? c.brand : c.chip,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 9,
                          height: 9,
                          decoration: BoxDecoration(
                            color: t.color,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          testName(context, t.id, t.label),
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: selected == t.id ? Colors.white : c.ink,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: TextStyle(color: c.danger)),
          ],
          const SizedBox(height: 28),
          FilledButton(
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
        ],
      ),
    );
  }
}
