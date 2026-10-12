import 'package:flutter/material.dart';

import '../../core/utils/tier_names.dart';
import '../../core/l10n/l10n.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/network/api_error.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/wf_colors.dart';
import '../../core/widgets/avatar_circle.dart';
import '../../data/practice_models.dart';
import '../../data/social_models.dart';
import '../auth/auth_providers.dart';
import '../practice/practice_providers.dart';
import 'tutors_providers.dart';

class TutorContactScreen extends ConsumerStatefulWidget {
  const TutorContactScreen({super.key, required this.tutor});

  final Tutor tutor;

  @override
  ConsumerState<TutorContactScreen> createState() => _TutorContactScreenState();
}

class _TutorContactScreenState extends ConsumerState<TutorContactScreen> {
  final _topic = TextEditingController();
  final _message = TextEditingController();
  bool _sending = false;
  String? _error;

  @override
  void dispose() {
    _topic.dispose();
    _message.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final msg = _message.text.trim();
    if (msg.isEmpty) {
      setState(
        () => _error = tr(
          context,
          'Escribe un mensaje para el profesor.',
          'Write a message for the teacher.',
        ),
      );
      return;
    }
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      await ref
          .read(tutorsRepositoryProvider)
          .request(
            tutorId: widget.tutor.id,
            message: msg,
            topic: _topic.text.trim(),
          );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(tr(context, 'Solicitud enviada ✓', 'Request sent ✓')),
        ),
      );
      context.go('/tutors');
    } on ApiFailure catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = WfColors.of(context);
    final t = widget.tutor;
    final profile = ref.watch(profileProvider).value;
    final tests = ref.watch(testsProvider).value ?? const <PracticeTest>[];
    final mine = (profile?.selectedTests ?? const <String>[])
        .map((id) {
          for (final x in tests) {
            if (x.id == id) return testName(context, x.id, x.label);
          }
          return id;
        })
        .join(', ');
    final hint = t.specialty == null
        ? tr(
            context,
            'Hola ${t.name}, necesito reforzar la PAES. ¿Tienes cupos disponibles?',
            'Hi ${t.name}, I need to reinforce the PAES. Do you have openings available?',
          )
        : tr(
            context,
            'Hola ${t.name}, necesito reforzar ${t.specialty}. ¿Tienes cupos disponibles?',
            'Hi ${t.name}, I need to reinforce ${t.specialty}. Do you have openings available?',
          );

    return Scaffold(
      appBar: AppBar(
        title: Text(tr(context, 'Contactar profesor', 'Contact teacher')),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
        children: [
          Text(
            tr(
              context,
              '${t.name} recibirá tu solicitud junto con tu perfil para conocer tus necesidades.',
              '${t.name} will receive your request along with your profile to understand your needs.',
            ),
            style: GoogleFonts.inter(fontSize: 13, color: c.muted, height: 1.5),
          ),
          const SizedBox(height: 14),
          Text(
            tr(
              context,
              'TU PERFIL (SE COMPARTIRÁ)',
              'YOUR PROFILE (WILL BE SHARED)',
            ),
            style: GoogleFonts.montserrat(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.8,
              color: c.muted,
            ),
          ),
          const SizedBox(height: 6),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(13),
              child: Row(
                children: [
                  AvatarCircle(
                    name: profile?.name ?? '?',
                    color: AppColors.oro,
                    size: 40,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          profile?.name ?? '',
                          style: GoogleFonts.inter(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        if (mine.isNotEmpty)
                          Text(
                            tr(context, 'Practica: $mine', 'Practices: $mine'),
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              color: c.muted,
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _topic,
            decoration: InputDecoration(
              hintText: t.specialty == null
                  ? tr(
                      context,
                      'Tema a reforzar (opcional)',
                      'Topic to reinforce (optional)',
                    )
                  : tr(
                      context,
                      'Tema a reforzar (ej: ${t.specialty})',
                      'Topic to reinforce (e.g. ${t.specialty})',
                    ),
            ),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _message,
            minLines: 4,
            maxLines: 6,
            decoration: InputDecoration(hintText: hint),
          ),
          if (_error != null) ...[
            const SizedBox(height: 10),
            Text(_error!, style: TextStyle(color: c.danger)),
          ],
          const SizedBox(height: 10),
          Text(
            tr(
              context,
              '💳 El pago de las clases se acuerda directamente con el profesor.',
              '💳 Payment for classes is agreed directly with the teacher.',
            ),
            style: GoogleFonts.inter(fontSize: 11, color: c.muted),
          ),
          const SizedBox(height: 20),
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
                : Text(tr(context, 'Enviar solicitud', 'Send request')),
          ),
        ],
      ),
    );
  }
}
