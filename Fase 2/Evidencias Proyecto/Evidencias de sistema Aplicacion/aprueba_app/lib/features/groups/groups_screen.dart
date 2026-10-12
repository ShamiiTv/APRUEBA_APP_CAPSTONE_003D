import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'groups_providers.dart';

class GroupsScreen extends ConsumerWidget {
  const GroupsScreen({super.key});
  Future<void> _join(BuildContext context, WidgetRef ref) async {
    final control = TextEditingController();
    final id = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Unirme a un grupo'),
        content: TextField(
          controller: control,
          decoration: const InputDecoration(labelText: 'Código del grupo'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, control.text.trim()),
            child: const Text('Unirme'),
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
    appBar: AppBar(title: const Text('Grupos de estudio')),
    body: ref
        .watch(groupsProvider)
        .when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => Center(
            child: TextButton(
              onPressed: () => ref.invalidate(groupsProvider),
              child: Text('$error. Reintentar'),
            ),
          ),
          data: (groups) => ListView(
            padding: const EdgeInsets.all(16),
            children: [
              FilledButton(
                onPressed: () => context.push('/groups/create'),
                child: const Text('Crear grupo'),
              ),
              OutlinedButton(
                onPressed: () => _join(context, ref),
                child: const Text('Unirme con código'),
              ),
              if (groups.isEmpty)
                const Padding(
                  padding: EdgeInsets.all(24),
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
            ],
          ),
        ),
  );
}
