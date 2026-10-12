import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../data/social_models.dart';
import 'groups_providers.dart';

class GroupDetailScreen extends ConsumerStatefulWidget {
  const GroupDetailScreen({super.key, required this.group});
  final StudyGroup group;
  @override
  ConsumerState<GroupDetailScreen> createState() => _GroupDetailState();
}

class _GroupDetailState extends ConsumerState<GroupDetailScreen> {
  Map<String, dynamic>? details;
  List<Post> posts = [];
  String? error;
  bool loading = true;
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final repo = ref.read(groupsRepositoryProvider);
      final result = await repo.details(widget.group.id);
      final feed = await repo.groupPosts(widget.group.id);
      if (mounted) {
        setState(() {
          details = result;
          posts = feed;
          error = null;
        });
      }
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> _leave() async {
    final yes = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('¿Salir del grupo?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Salir'),
          ),
        ],
      ),
    );
    if (yes != true) return;
    try {
      await ref
          .read(groupsRepositoryProvider)
          .removeMember(widget.group.id, '');
      ref.invalidate(groupsProvider);
      if (mounted) context.go('/groups');
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(widget.group.name)),
    body: loading
        ? const Center(child: CircularProgressIndicator())
        : error != null
        ? Center(
            child: TextButton(
              onPressed: _load,
              child: Text('$error · Reintentar'),
            ),
          )
        : ListView(
            padding: const EdgeInsets.all(16),
            children: [
              OutlinedButton.icon(
                onPressed: () async {
                  await Clipboard.setData(ClipboardData(text: widget.group.id));
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text(
                          'Código copiado. Compártelo con tu grupo.',
                        ),
                      ),
                    );
                  }
                },
                icon: const Icon(Icons.copy),
                label: const Text('Copiar código para invitar'),
              ),
              Text(
                'Integrantes',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              for (final member in (details?['members'] as List? ?? []))
                ListTile(
                  title: Text(member['name'].toString()),
                  subtitle: Text(
                    '${member['answered']} respuestas · ${member['accuracy'] == null ? 'Sin práctica' : '${member['accuracy']}% de aciertos'}',
                  ),
                ),
              const Divider(),
              Text(
                'Muro del grupo',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              if (posts.isEmpty) const Text('Todavía no hay publicaciones.'),
              for (final post in posts)
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(post.authorName),
                        Text(post.text),
                        if (post.questionStatement != null)
                          Text(post.questionStatement!),
                      ],
                    ),
                  ),
                ),
              TextButton(
                onPressed: _leave,
                child: const Text('Salir del grupo'),
              ),
            ],
          ),
  );
}
