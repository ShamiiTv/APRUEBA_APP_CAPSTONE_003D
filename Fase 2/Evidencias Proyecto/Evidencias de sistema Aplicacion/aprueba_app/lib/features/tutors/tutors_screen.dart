import '../../core/widgets/content_skeleton.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/l10n/l10n.dart';
import 'tutors_providers.dart';

class TutorsScreen extends ConsumerStatefulWidget {
  const TutorsScreen({super.key});
  @override
  ConsumerState<TutorsScreen> createState() => _TutorsState();
}

class _TutorsState extends ConsumerState<TutorsScreen> {
  String subject = 'all';
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(tr(context, 'Tutores', 'Tutors'))),
    body: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          tr(
            context,
            'TUTORES SIMULADOS · Perfiles ficticios. No se contacta a un profesor real ni se cobra una sesión.',
            'SIMULATED TUTORS · Fictional profiles. No real teacher is contacted or session charged.',
          ),
        ),
        DropdownButton<String>(
          value: subject,
          items: [
            DropdownMenuItem(
              value: 'all',
              child: Text(tr(context, 'Todas las materias', 'All subjects')),
            ),
            const DropdownMenuItem(value: 'm1', child: Text('M1')),
            const DropdownMenuItem(value: 'm2', child: Text('M2')),
            DropdownMenuItem(
              value: 'lectora',
              child: Text(tr(context, 'Lectora', 'Reading')),
            ),
            DropdownMenuItem(
              value: 'cien',
              child: Text(tr(context, 'Ciencias', 'Science')),
            ),
            DropdownMenuItem(
              value: 'hist',
              child: Text(tr(context, 'Historia', 'History')),
            ),
          ],
          onChanged: (value) => setState(() => subject = value!),
        ),
        ref
            .watch(tutorsProvider)
            .when(
              loading: () => const ContentSkeleton(kind: 'tutors', inline: true),
              error: (e, s) => TextButton(
                onPressed: () => ref.invalidate(tutorsProvider),
                child: Text(tr(context, 'Reintentar', 'Retry')),
              ),
              data: (tutors) => Column(
                children: [
                  for (final tutor in tutors.where(
                    (t) => subject == 'all' || t.subjectTestId == subject,
                  ))
                    Card(
                      child: ListTile(
                        leading: const CircleAvatar(child: Icon(Icons.school)),
                        title: Text(
                          tr(
                            context,
                            tutor.name,
                            'Demo tutor · ${tutor.subjectTestId.toUpperCase()}',
                          ),
                        ),
                        subtitle: Text(
                          tr(
                            context,
                            tutor.subjectLabel,
                            'Fictional tutoring profile',
                          ),
                        ),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () =>
                            context.push('/tutors/profile', extra: tutor),
                      ),
                    ),
                ],
              ),
            ),
      ],
    ),
  );
}
