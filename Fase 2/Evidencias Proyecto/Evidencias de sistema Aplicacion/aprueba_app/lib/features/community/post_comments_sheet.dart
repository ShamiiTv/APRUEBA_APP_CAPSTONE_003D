import 'package:flutter/material.dart';

import '../../core/l10n/l10n.dart';
import '../../data/social_models.dart';
import 'community_repository.dart';

class PostCommentsSheet extends StatefulWidget {
  const PostCommentsSheet({
    super.key,
    required this.postId,
    required this.onCountChanged,
    this.repository,
  });
  final String postId;
  final void Function(int) onCountChanged;
  final CommunityRepository? repository;
  @override
  State<PostCommentsSheet> createState() => _PostCommentsState();
}

class _PostCommentsState extends State<PostCommentsSheet> {
  late final repo = widget.repository ?? CommunityRepository();
  final input = TextEditingController();
  List<PostComment> rows = [];
  String? cursor, error;
  bool loading = true, sending = false;
  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    input.dispose();
    super.dispose();
  }

  Future<void> _load({bool more = false}) async {
    if (more && cursor == null) return;
    setState(() => loading = true);
    try {
      final page = await repo.fetchCommentsPage(
        widget.postId,
        cursor: more ? cursor : null,
      );
      if (mounted) {
        setState(() {
          final combined = [if (more) ...rows, ...page.comments];
          rows = {for (final r in combined) r.id: r}.values.toList();
          cursor = page.nextCursor;
          error = null;
        });
      }
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> _send() async {
    if (sending || input.text.trim().isEmpty) return;
    setState(() => sending = true);
    try {
      final result = await repo.addCommentWithCount(
        widget.postId,
        input.text.trim(),
      );
      if (!mounted) return;
      setState(() {
        rows = {
          result.comment.id: result.comment,
          for (final r in rows) r.id: r,
        }.values.toList();
        error = null;
        input.clear();
      });
      widget.onCountChanged(result.count);
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => sending = false);
    }
  }

  @override
  Widget build(BuildContext context) => SafeArea(
    child: Padding(
      padding: EdgeInsets.fromLTRB(
        16,
        8,
        16,
        16 + MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SizedBox(
        height: MediaQuery.of(context).size.height * .7,
        child: Column(
          children: [
            Text(
              tr(context, 'Comentarios', 'Comments'),
              style: Theme.of(context).textTheme.titleLarge,
            ),
            if (error != null) Text(error!),
            Expanded(
              child: ListView(
                children: [
                  if (loading) const LinearProgressIndicator(),
                  if (!loading && rows.isEmpty)
                    Text(
                      tr(
                        context,
                        'Sé el primero en comentar.',
                        'Be the first to comment.',
                      ),
                    ),
                  for (final row in rows)
                    ListTile(
                      title: Text(row.authorName),
                      subtitle: Text(row.text),
                    ),
                  if (cursor != null)
                    TextButton(
                      onPressed: loading ? null : () => _load(more: true),
                      child: Text(
                        tr(
                          context,
                          'Ver comentarios anteriores',
                          'Older comments',
                        ),
                      ),
                    ),
                  if (error != null)
                    TextButton(
                      onPressed: () => _load(more: rows.isNotEmpty),
                      child: Text(tr(context, 'Reintentar', 'Retry')),
                    ),
                ],
              ),
            ),
            TextField(
              controller: input,
              maxLength: 1000,
              enabled: !sending,
              decoration: InputDecoration(
                labelText: tr(
                  context,
                  'Escribe tu comentario',
                  'Write your comment',
                ),
              ),
            ),
            FilledButton(
              onPressed: sending ? null : _send,
              child: Text(tr(context, 'Comentar', 'Comment')),
            ),
          ],
        ),
      ),
    ),
  );
}
