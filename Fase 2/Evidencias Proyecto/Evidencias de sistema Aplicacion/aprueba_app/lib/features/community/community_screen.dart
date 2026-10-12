import 'package:flutter/material.dart';

import '../../core/l10n/l10n.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/network/api_error.dart';
import '../../core/theme/wf_colors.dart';
import '../../core/utils/format_utils.dart';
import '../../core/widgets/avatar_circle.dart';
import '../../data/social_models.dart';
import 'community_providers.dart';

class CommunityScreen extends ConsumerStatefulWidget {
  const CommunityScreen({super.key});

  @override
  ConsumerState<CommunityScreen> createState() => _CommunityScreenState();
}

class _CommunityScreenState extends ConsumerState<CommunityScreen> {
  final _composer = TextEditingController();
  bool _loading = true;
  bool _posting = false;
  String? _error;
  List<Post> _posts = [];
  String? _nextCursor;
  bool _loadingMore = false;

  @override
  void initState() {
    super.initState();
    _composer.addListener(() => setState(() {}));
    _load();
  }

  @override
  void dispose() {
    _composer.dispose();
    super.dispose();
  }

  void _snack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  Future<void> _load({bool silent = false}) async {
    if (!silent) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }
    try {
      final page = await ref.read(communityRepositoryProvider).fetchFeed();
      if (!mounted) return;
      setState(() {
        _posts = page.posts;
        _nextCursor = page.nextCursor;
      });
    } on ApiFailure catch (e) {
      if (!mounted) return;
      if (silent) {
        _snack(e.message);
      } else {
        setState(() => _error = e.message);
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadMore() async {
    final cursor = _nextCursor;
    if (cursor == null || _loadingMore) return;
    setState(() => _loadingMore = true);
    try {
      final page = await ref
          .read(communityRepositoryProvider)
          .fetchFeed(cursor: cursor);
      if (!mounted) return;
      final known = _posts.map((p) => p.id).toSet();
      setState(() {
        _posts = [..._posts, ...page.posts.where((p) => !known.contains(p.id))];
        _nextCursor = page.nextCursor;
      });
    } on ApiFailure catch (e) {
      _snack(e.message);
    } finally {
      if (mounted) setState(() => _loadingMore = false);
    }
  }

  Future<void> _openComments(Post p) async {
    if (p.commentCount == 0 || p.comments.isNotEmpty) return;
    try {
      final list = await ref
          .read(communityRepositoryProvider)
          .fetchComments(p.id);
      _replace(
        p.id,
        (x) => x.copyWith(comments: list, commentCount: list.length),
      );
    } on ApiFailure catch (e) {
      _snack(e.message);
    }
  }

  void _replace(String id, Post Function(Post) change) {
    setState(() {
      _posts = [for (final p in _posts) p.id == id ? change(p) : p];
    });
  }

  Future<void> _publish() async {
    final text = _composer.text.trim();
    if (text.isEmpty || _posting) return;
    setState(() => _posting = true);
    try {
      final post = await ref.read(communityRepositoryProvider).createPost(text);
      if (!mounted) return;
      setState(() {
        _posts = [post, ..._posts];
        _composer.clear();
      });
    } on ApiFailure catch (e) {
      _snack(e.message);
    } finally {
      if (mounted) setState(() => _posting = false);
    }
  }

  Future<void> _like(Post p) async {
    try {
      final r = await ref
          .read(communityRepositoryProvider)
          .toggleLike(p.id, liked: !p.userLiked);
      _replace(
        p.id,
        (x) => x.copyWith(userLiked: r.liked, likeCount: r.likeCount),
      );
    } on ApiFailure catch (e) {
      _snack(e.message);
    }
  }

  Future<bool> _comment(Post p, String text) async {
    try {
      final c = await ref
          .read(communityRepositoryProvider)
          .addComment(p.id, text);
      _replace(
        p.id,
        (x) => x.copyWith(
          comments: [...x.comments, c],
          commentCount: x.commentCount + 1,
        ),
      );
      return true;
    } on ApiFailure catch (e) {
      _snack(e.message);
      return false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = WfColors.of(context);
    final tt = Theme.of(context).textTheme;

    Widget body;
    if (_loading) {
      body = const Center(child: CircularProgressIndicator());
    } else if (_error != null) {
      body = Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                _error!,
                textAlign: TextAlign.center,
                style: TextStyle(color: c.danger),
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: _load,
                child: Text(tr(context, 'Reintentar', 'Retry')),
              ),
            ],
          ),
        ),
      );
    } else {
      body = RefreshIndicator(
        onRefresh: () => _load(silent: true),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
          children: [
            Text(
              tr(context, 'Comunidad Aprueba', 'Aprueba Community'),
              style: tt.headlineSmall,
            ),
            const SizedBox(height: 10),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(10),
                child: Column(
                  children: [
                    TextField(
                      controller: _composer,
                      minLines: 1,
                      maxLines: 4,
                      decoration: InputDecoration(
                        hintText: tr(
                          context,
                          'Comparte una pregunta…',
                          'Share a question…',
                        ),
                      ),
                    ),
                    if (_composer.text.trim().isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Align(
                        alignment: Alignment.centerRight,
                        child: FilledButton(
                          onPressed: _posting ? null : _publish,
                          style: FilledButton.styleFrom(
                            minimumSize: const Size(0, 36),
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                          ),
                          child: _posting
                              ? const SizedBox(
                                  height: 16,
                                  width: 16,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : Text(tr(context, 'Publicar', 'Post')),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            if (_posts.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 40),
                child: Text(
                  tr(
                    context,
                    'Todavía no hay publicaciones.\n¡Sé el primero en compartir algo!',
                    'There are no posts yet.\nBe the first to share something!',
                  ),
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(fontSize: 13, color: c.muted),
                ),
              ),
            for (final p in _posts)
              _PostCard(
                key: ValueKey(p.id),
                post: p,
                onLike: () => _like(p),
                onComment: (t) => _comment(p, t),
                onOpen: () => _openComments(p),
              ),
            if (_nextCursor != null)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: OutlinedButton(
                  onPressed: _loadingMore ? null : _loadMore,
                  child: _loadingMore
                      ? const SizedBox(
                          height: 18,
                          width: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Text(
                          tr(
                            context,
                            'Ver más publicaciones',
                            'Load more posts',
                          ),
                        ),
                ),
              ),
          ],
        ),
      );
    }

    return Scaffold(body: SafeArea(child: body));
  }
}

class _PostCard extends StatefulWidget {
  const _PostCard({
    super.key,
    required this.post,
    required this.onLike,
    required this.onComment,
    required this.onOpen,
  });

  final Post post;
  final Future<void> Function() onLike;
  final Future<bool> Function(String text) onComment;
  final Future<void> Function() onOpen;

  @override
  State<_PostCard> createState() => _PostCardState();
}

class _PostCardState extends State<_PostCard> {
  bool _open = false;
  bool _sending = false;
  final _ctrl = TextEditingController();

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final t = _ctrl.text.trim();
    if (t.isEmpty || _sending) return;
    setState(() => _sending = true);
    final ok = await widget.onComment(t);
    if (ok) _ctrl.clear();
    if (mounted) setState(() => _sending = false);
  }

  @override
  Widget build(BuildContext context) {
    final c = WfColors.of(context);
    final p = widget.post;

    return Padding(
      padding: const EdgeInsets.only(top: 11),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(13),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  AvatarCircle(
                    name: p.authorName,
                    color: p.authorColor,
                    size: 32,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          p.authorName,
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        Text(
                          timeAgo(p.createdAt),
                          style: GoogleFonts.inter(
                            fontSize: 10,
                            color: c.muted,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(p.text, style: GoogleFonts.inter(fontSize: 13, height: 1.4)),
              if (p.questionStatement != null) ...[
                const SizedBox(height: 8),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: c.bg,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: c.line),
                  ),
                  child: Text(
                    p.questionStatement!,
                    style: GoogleFonts.inter(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 10),
              Row(
                children: [
                  InkWell(
                    borderRadius: BorderRadius.circular(8),
                    onTap: widget.onLike,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        vertical: 4,
                        horizontal: 2,
                      ),
                      child: Text(
                        '👍 ${p.likeCount}',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: p.userLiked
                              ? FontWeight.w800
                              : FontWeight.w500,
                          color: p.userLiked ? c.brand : c.muted,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  InkWell(
                    borderRadius: BorderRadius.circular(8),
                    onTap: () {
                      setState(() => _open = !_open);
                      if (_open) widget.onOpen();
                    },
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        vertical: 4,
                        horizontal: 2,
                      ),
                      child: Text(
                        '💬 ${p.commentCount}',
                        style: GoogleFonts.inter(fontSize: 12, color: c.muted),
                      ),
                    ),
                  ),
                ],
              ),
              if (_open) ...[
                Divider(color: c.line, height: 18),
                for (final cm in p.comments)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        AvatarCircle(
                          name: cm.authorName,
                          color: cm.authorColor,
                          size: 24,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${cm.authorName} · ${timeAgo(cm.createdAt)}',
                                style: GoogleFonts.inter(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: c.muted,
                                ),
                              ),
                              Text(
                                cm.text,
                                style: GoogleFonts.inter(fontSize: 12.5),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _ctrl,
                        onSubmitted: (_) => _send(),
                        decoration: InputDecoration(
                          hintText: tr(
                            context,
                            'Escribe un comentario…',
                            'Write a comment…',
                          ),
                        ),
                      ),
                    ),
                    IconButton(
                      onPressed: _sending ? null : _send,
                      icon: Icon(Icons.send_rounded, color: c.brand),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
