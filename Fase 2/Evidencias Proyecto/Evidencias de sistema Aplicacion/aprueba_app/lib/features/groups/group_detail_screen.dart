import '../../core/widgets/content_skeleton.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../data/social_models.dart';
import '../../core/l10n/l10n.dart';
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
        title: Text(tr(context, '¿Salir del grupo?', 'Leave this group?')),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(tr(context, 'Cancelar', 'Cancel')),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(tr(context, 'Salir', 'Leave')),
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
        ? const ContentSkeleton(kind: 'cards')
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
              Text(
                tr(
                  context,
                  'Invita a tus compañeros',
                  'Invite your classmates',
                ),
                style: Theme.of(context).textTheme.titleLarge,
              ),
              Text(
                tr(
                  context,
                  'Comparte el enlace o el código completo. Quien lo reciba debe iniciar sesión y confirmar que desea unirse.',
                  'Share the link or full code. Recipients must sign in and confirm they want to join.',
                ),
              ),
              const SizedBox(height: 12),
              SelectableText(details?['inviteCode']?.toString() ?? ''),
              const SizedBox(height: 8),
              OutlinedButton.icon(
                onPressed: details?['inviteCode'] == null
                    ? null
                    : () async {
                        final link = Uri.https(
                          'aprueba.shamiiplay.com',
                          '/invitacion',
                          {'codigo': details!['inviteCode'].toString()},
                        ).toString();
                        await Clipboard.setData(ClipboardData(text: link));
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                tr(
                                  context,
                                  'Enlace de invitación copiado.',
                                  'Invitation link copied.',
                                ),
                              ),
                            ),
                          );
                        }
                      },
                icon: const Icon(Icons.link),
                label: Text(
                  tr(
                    context,
                    'Copiar enlace de invitación',
                    'Copy invitation link',
                  ),
                ),
              ),
              OutlinedButton.icon(
                onPressed: () async {
                  await Clipboard.setData(
                    ClipboardData(
                      text:
                          details?['inviteCode']?.toString() ?? widget.group.id,
                    ),
                  );
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                          tr(
                            context,
                            'Código copiado. Compártelo con tu grupo.',
                            'Code copied. Share it with your group.',
                          ),
                        ),
                      ),
                    );
                  }
                },
                icon: const Icon(Icons.copy),
                label: Text(
                  tr(
                    context,
                    'Copiar código para invitar',
                    'Copy invitation code',
                  ),
                ),
              ),
              Text((details?['description'] ?? '').toString()),
              Text(
                tr(
                  context,
                  details?['visibility'] == 'public'
                      ? 'Grupo público'
                      : 'Grupo privado',
                  details?['visibility'] == 'public'
                      ? 'Public group'
                      : 'Private group',
                ),
              ),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Text(
                    tr(
                      context,
                      "${details?['statistics']?['correct'] ?? 0} correctas / ${details?['statistics']?['answered'] ?? 0} respuestas · ${details?['statistics']?['accuracy'] ?? '—'}% · no es puntaje PAES",
                      "${details?['statistics']?['correct'] ?? 0} correct / ${details?['statistics']?['answered'] ?? 0} answers · ${details?['statistics']?['accuracy'] ?? '—'}% · not a PAES score",
                    ),
                  ),
                ),
              ),
              Text(
                tr(context, 'Integrantes', 'Members'),
                style: Theme.of(context).textTheme.titleLarge,
              ),
              for (final member in (details?['members'] as List? ?? []))
                ListTile(
                  title: Text(member['name'].toString()),
                  subtitle: Text(
                    tr(
                      context,
                      '${member['answered']} respuestas · ${member['accuracy'] == null ? 'Sin práctica' : '${member['accuracy']}% de aciertos'}',
                      '${member['answered']} answers · ${member['accuracy'] == null ? 'No practice yet' : '${member['accuracy']}% correct'}',
                    ),
                  ),
                ),
              const Divider(),
              Text(
                tr(context, 'Muro del grupo', 'Group discussion'),
                style: Theme.of(context).textTheme.titleLarge,
              ),
              if (posts.isEmpty)
                Text(
                  tr(context, 'Todavía no hay publicaciones.', 'No posts yet.'),
                ),
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
                child: Text(tr(context, 'Salir del grupo', 'Leave group')),
              ),
            ],
          ),
  );
}
