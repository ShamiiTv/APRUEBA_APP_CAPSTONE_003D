import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/l10n/l10n.dart';
import '../../core/network/api_error.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/wf_colors.dart';
import '../../core/widgets/wf_widgets.dart';
import 'groups_providers.dart';

class ShareQuestionScreen extends ConsumerStatefulWidget {
  const ShareQuestionScreen({super.key, required this.args});

  /// questionId, statement, isCorrect, elapsedMs
  final Map<String, dynamic> args;

  @override
  ConsumerState<ShareQuestionScreen> createState() =>
      _ShareQuestionScreenState();
}

class _ShareQuestionScreenState extends ConsumerState<ShareQuestionScreen> {
  final _comment = TextEditingController();
  String? _groupId;
  bool _sending = false;
  String? _error;

  @override
  void dispose() {
    _comment.dispose();
    super.dispose();
  }

  String _fmt(int ms) {
    final s = (ms / 1000).round();
    return '${s ~/ 60}:${(s % 60).toString().padLeft(2, '0')}';
  }

  Future<void> _send() async {
    final id = _groupId;
    if (id == null) {
      setState(
        () => _error = tr(context, 'Elige un grupo.', 'Choose a group.'),
      );
      return;
    }
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      await ref
          .read(groupsRepositoryProvider)
          .shareQuestion(
            groupId: id,
            questionId: widget.args['questionId'].toString(),
            comment: _comment.text.trim(),
          );
      ref.invalidate(sharedQuestionsProvider(id));
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            tr(
              context,
              'Pregunta compartida en el grupo',
              'Question shared with the group',
            ),
          ),
        ),
      );
      context.pop();
    } on ApiFailure catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Widget _label(String text, WfColors c) => Padding(
    padding: const EdgeInsets.only(top: 16, bottom: 8),
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

  @override
  Widget build(BuildContext context) {
    final c = WfColors.of(context);
    final groups = ref.watch(groupsProvider);
    final correct = widget.args['isCorrect'] == true;
    final ms = (widget.args['elapsedMs'] as num?)?.toInt() ?? 0;

    return Scaffold(
      appBar: AppBar(
        title: Text(tr(context, 'Compartir al grupo', 'Share with group')),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: c.soft,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: c.brand, width: 1.5),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.args['statement'].toString(),
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                WfTag(
                  text: correct
                      ? '✅ ${tr(context, 'Correcto en', 'Correct in')} ${_fmt(ms)}'
                      : '❌ ${tr(context, 'Incorrecto en', 'Incorrect in')} ${_fmt(ms)}',
                  bg: correct
                      ? const Color(0x2110B981)
                      : const Color(0x21EF4444),
                  fg: correct
                      ? const Color(0xFF059669)
                      : const Color(0xFFDC2626),
                ),
              ],
            ),
          ),
          _label(tr(context, 'Elige el grupo', 'Choose the group'), c),
          groups.when(
            loading: () => const Padding(
              padding: EdgeInsets.all(20),
              child: Center(child: CircularProgressIndicator()),
            ),
            error: (e, _) => Text(
              e is ApiFailure ? e.message : 'No se pudieron cargar tus grupos.',
              style: TextStyle(color: c.danger),
            ),
            data: (list) {
              if (list.isEmpty) {
                return Column(
                  children: [
                    Text(
                      tr(
                        context,
                        'Todavía no tienes grupos. Crea uno para compartir preguntas.',
                        "You don't have groups yet. Create one to share questions.",
                      ),
                      textAlign: TextAlign.center,
                      style: GoogleFonts.inter(fontSize: 13, color: c.muted),
                    ),
                    const SizedBox(height: 10),
                    OutlinedButton(
                      onPressed: () => context.push('/groups/create'),
                      child: Text(tr(context, 'Crear grupo', 'Create group')),
                    ),
                  ],
                );
              }
              return Column(
                children: [
                  for (final g in list)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(14),
                        onTap: () => setState(() => _groupId = g.id),
                        child: Ink(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: c.soft,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: _groupId == g.id ? c.brand : c.line,
                              width: _groupId == g.id ? 2 : 1.5,
                            ),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 32,
                                height: 32,
                                alignment: Alignment.center,
                                decoration: BoxDecoration(
                                  color: g.color,
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Text(
                                  g.name.isEmpty
                                      ? '?'
                                      : g.name[0].toUpperCase(),
                                  style: GoogleFonts.montserrat(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w800,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  g.name,
                                  style: GoogleFonts.montserrat(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                              if (_groupId == g.id)
                                const Text('✅', style: TextStyle(fontSize: 18)),
                            ],
                          ),
                        ),
                      ),
                    ),
                ],
              );
            },
          ),
          _label(
            tr(
              context,
              'Agrega un comentario (opcional)',
              'Add a comment (optional)',
            ),
            c,
          ),
          TextField(
            controller: _comment,
            minLines: 3,
            maxLines: 4,
            maxLength: 280,
            decoration: InputDecoration(
              hintText: tr(
                context,
                '¿Qué quieres decir?',
                'What do you want to say?',
              ),
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 6),
            Text(_error!, style: TextStyle(color: c.danger)),
          ],
          const SizedBox(height: 10),
          FilledButton(
            onPressed: _sending ? null : _send,
            child: _sending
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: AppColors.azul,
                    ),
                  )
                : Text(
                    tr(
                      context,
                      'Compartir en el grupo',
                      'Share with the group',
                    ),
                  ),
          ),
          TextButton(
            onPressed: () => context.pop(),
            child: Text(tr(context, 'Cancelar', 'Cancel')),
          ),
        ],
      ),
    );
  }
}
