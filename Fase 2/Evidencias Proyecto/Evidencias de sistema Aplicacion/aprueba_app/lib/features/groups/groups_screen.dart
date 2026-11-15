import '../../core/widgets/content_skeleton.dart';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'groups_providers.dart';
import '../../core/l10n/l10n.dart';
import '../../data/social_models.dart';

final publicGroupsProvider = FutureProvider<List<StudyGroup>>(
  (ref) => ref.read(groupsRepositoryProvider).publicGroups(),
);

class GroupsScreen extends ConsumerWidget {
  const GroupsScreen({super.key});
  Future<void> _join(BuildContext context, WidgetRef ref) async {
    final control = TextEditingController();
    final id = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(tr(context, 'Unirme a un grupo', 'Join a group')),
        content: TextField(
          controller: control,
          decoration: InputDecoration(
            labelText: tr(
              context,
              'Enlace o código del grupo',
              'Group link or code',
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(tr(context, 'Cancelar', 'Cancel')),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, control.text.trim()),
            child: Text(tr(context, 'Unirme', 'Join')),
          ),
        ],
      ),
    );
    control.dispose();
    if (id == null || id.isEmpty) return;
    try {
      await ref.read(groupsRepositoryProvider).acceptInvitation(id);
      ref.invalidate(groupsProvider);
    } catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.toString())));
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) => Scaffold(
    appBar: AppBar(
      title: Text(tr(context, 'Grupos de estudio', 'Study groups')),
    ),
    body: ref
        .watch(groupsProvider)
        .when(
          loading: () => const ContentSkeleton(kind: 'groups'),
          error: (error, _) => Center(
            child: TextButton(
              onPressed: () => ref.invalidate(groupsProvider),
              child: Text('$error. Reintentar'),
            ),
          ),
          data: (groups) => ListView(
            padding: const EdgeInsets.all(16),
            children: [
              FilledButton.icon(
                icon: const Icon(Icons.group_add_outlined),
                onPressed: () => context.push('/groups/create'),
                label: Text(tr(context, 'Crear grupo', 'Create group')),
              ),
              const SizedBox(height: 10),
              OutlinedButton.icon(
                icon: const Icon(Icons.link),
                onPressed: () => _join(context, ref),
                label: Text(tr(context, 'Unirme con código', 'Join with code')),
              ),
              const SizedBox(height: 24),
              Text(
                tr(context, 'Mis grupos', 'My groups'),
                style: Theme.of(context).textTheme.titleMedium,
              ),
              if (groups.isEmpty)
                Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text('Todavía no perteneces a un grupo.'),
                ),
              for (final group in groups)
                Card(
                  child: ListTile(
                    title: Text(group.name),
                    subtitle: Text(
                      '${group.subjectTestId.toUpperCase()} · ${group.memberCount} integrantes',
                    ),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => context.push('/groups/detail', extra: group),
                  ),
                ),
              const SizedBox(height: 24),
              Text(
                tr(context, 'Descubrir grupos públicos', 'Public groups'),
                style: Theme.of(context).textTheme.titleMedium,
              ),
              ref
                  .watch(publicGroupsProvider)
                  .when(
                    loading: () =>
                        const ContentSkeleton(kind: 'groups', inline: true),
                    error: (e, s) => TextButton(
                      onPressed: () => ref.invalidate(publicGroupsProvider),
                      child: Text(
                        tr(context, 'Reintentar catálogo', 'Retry directory'),
                      ),
                    ),
                    data: (directory) => Column(
                      children: [
                        for (final group in directory)
                          Card(
                            child: ListTile(
                              title: Text(group.name),
                              subtitle: Text(group.subjectTestId.toUpperCase()),
                              trailing: TextButton(
                                onPressed:
                                    groups.any((mine) => mine.id == group.id)
                                    ? () => context.push(
                                        '/groups/detail',
                                        extra: groups.firstWhere(
                                          (mine) => mine.id == group.id,
                                        ),
                                      )
                                    : () async {
                                        try {
                                          await ref
                                              .read(groupsRepositoryProvider)
                                              .acceptInvitation(group.id);
                                          ref.invalidate(groupsProvider);
                                        } catch (e) {
                                          if (context.mounted) {
                                            ScaffoldMessenger.of(context)
                                                .showSnackBar(
                                                  SnackBar(
                                                    content: Text(e.toString()),
                                                  ),
                                                );
                                          }
                                        }
                                      },
                                child: Text(
                                  groups.any((mine) => mine.id == group.id)
                                      ? tr(
                                          context,
                                          'Abrir mi grupo',
                                          'Open my group',
                                        )
                                      : tr(context, 'Unirme', 'Join'),
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
            ],
          ),
        ),
  );
}
