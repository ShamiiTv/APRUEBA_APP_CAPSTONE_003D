import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/l10n/l10n.dart';
import '../../core/theme/wf_colors.dart';
import '../../core/utils/tier_names.dart';
import '../../core/widgets/avatar_circle.dart';
import '../../core/widgets/content_skeleton.dart';
import '../../data/social_models.dart';
import 'groups_providers.dart';
import '../community/community_repository.dart';



class GroupDetailScreen extends ConsumerStatefulWidget {
  const GroupDetailScreen({super.key, required this.group});
  final StudyGroup group;
  @override
  ConsumerState<GroupDetailScreen> createState() => _GroupDetailState();
}

class _GroupDetailState extends ConsumerState<GroupDetailScreen> {
  static const _azul = Color(0xFF1A365D);
  static const _palette = [
    Color(0xFF1A365D),
    Color(0xFF10B981),
    Color(0xFF6366F1),
    Color(0xFFF5AF41),
    Color(0xFFEF4444),
  ];

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
    final c = WfColors.of(context);
    final isOwner = widget.group.ownerId.isNotEmpty &&
        (details?['role'] == 'owner');
    final alone = ((details?['memberCount'] as num?)?.toInt() ??
            widget.group.memberCount) <=
        1;

    final yes = await showDialog<bool>(
      context: context,
      builder: (ctx) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(22, 22, 22, 14),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                tr(ctx, '¿Salir del grupo?', 'Leave this group?'),
                style: GoogleFonts.montserrat(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: c.ink,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                alone
                    ? tr(
                        ctx,
                        'Eres el único integrante: al salir, el grupo quedará archivado.',
                        'You are the only member: if you leave, the group will be archived.',
                      )
                    : isOwner
                        ? tr(
                            ctx,
                            'Eres el dueño: al salir, la propiedad pasará a otro integrante.',
                            'You are the owner: if you leave, ownership will pass to another member.',
                          )
                        : tr(
                            ctx,
                            'Dejarás de ver este grupo y su muro. Puedes volver a unirte con el código.',
                            'You will no longer see this group or its wall. You can rejoin with the code.',
                          ),
                style: GoogleFonts.inter(fontSize: 13, color: c.muted, height: 1.4),
              ),
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFFF5AF41),
                    foregroundColor: _azul,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                    textStyle: GoogleFonts.montserrat(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  onPressed: () => Navigator.pop(ctx, true),
                  child: Text(tr(ctx, 'Salir', 'Leave')),
                ),
              ),
              Center(
                child: TextButton(
                  onPressed: () => Navigator.pop(ctx, false),
                  child: Text(
                    tr(ctx, 'Cancelar', 'Cancel'),
                    style: GoogleFonts.montserrat(
                      fontWeight: FontWeight.w800,
                      color: _azul,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
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

  Future<void> _copy(String text, String message) async {
    await Clipboard.setData(ClipboardData(text: text));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

    void _invite() {
    final code = details?['inviteCode']?.toString() ?? widget.group.id;
    final link = Uri.https(
      'aprueba.shamiiplay.com',
      '/invitacion',
      {'codigo': code},
    ).toString();
    final c = WfColors.of(context);
    final g = widget.group;
    final subject =
        testName(context, g.subjectTestId, g.subjectTestId.toUpperCase());
    final members = (details?['members'] as List? ?? [])
        .map((m) => Map<String, dynamic>.from(m as Map))
        .toList();

    Widget copyRow(String label, String value, String done) => Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.fromLTRB(14, 10, 8, 10),
          decoration: BoxDecoration(
            color: c.chip,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: c.line),
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: GoogleFonts.montserrat(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.8,
                        color: c.muted,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      value,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.inter(fontSize: 12, color: c.ink),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              FilledButton(
                style: FilledButton.styleFrom(
                  minimumSize: const Size(0, 40),
                  backgroundColor: _azul,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  textStyle: GoogleFonts.montserrat(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                onPressed: () => _copy(value, done),
                child: Text(tr(context, 'Copiar', 'Copy')),
              ),
            ],
          ),
        );

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (ctx) => ConstrainedBox(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(ctx).size.height * 0.85,
        ),
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: _azul,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      g.name,
                      style: GoogleFonts.montserrat(
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                    Text(
                      tr(context, '$subject · ${members.length} miembros',
                          '$subject · ${members.length} members'),
                      style: GoogleFonts.inter(
                          fontSize: 12, color: Colors.white70),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),
              Text(
                tr(context, 'Invitar miembros', 'Invite members'),
                style: GoogleFonts.montserrat(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: c.ink,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                tr(
                  context,
                  'Comparte el enlace o el código con tus compañeros. Quien lo reciba debe iniciar sesión y confirmar que desea unirse.',
                  'Share the link or code with your classmates. Recipients must sign in and confirm they want to join.',
                ),
                style: GoogleFonts.inter(fontSize: 13, color: c.muted),
              ),
              const SizedBox(height: 16),
              copyRow(
                tr(context, 'ENLACE DE INVITACIÓN', 'INVITATION LINK'),
                link,
                tr(context, 'Enlace de invitación copiado.',
                    'Invitation link copied.'),
              ),
              copyRow(
                tr(context, 'CÓDIGO DEL GRUPO', 'GROUP CODE'),
                code,
                tr(context, 'Código copiado. Compártelo con tu grupo.',
                    'Code copied. Share it with your group.'),
              ),
              const SizedBox(height: 10),
              Text(
                tr(context, 'YA SE UNIERON', 'ALREADY JOINED'),
                style: GoogleFonts.montserrat(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.8,
                  color: c.muted,
                ),
              ),
              const SizedBox(height: 10),
              for (var i = 0; i < members.length; i++)
                Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: c.chip,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: c.line),
                  ),
                  child: Row(
                    children: [
                      AvatarCircle(
                        name: members[i]['name'].toString(),
                        color: _palette[i % _palette.length],
                        size: 34,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          members[i]['name'].toString(),
                          style: GoogleFonts.inter(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: c.ink,
                          ),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFD1F2E6),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          members[i]['role'] == 'owner'
                              ? tr(context, 'Dueño', 'Owner')
                              : tr(context, 'Unido', 'Joined'),
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF047857),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

    void _comments(Post post) {
    final repo = CommunityRepository();
    final ctrl = TextEditingController();
    List<PostComment> list = [];
    bool loading = true, started = false, sending = false;
    String? err;

    String ago(DateTime? d) {
      if (d == null) return '';
      final m = DateTime.now().difference(d).inMinutes;
      if (m < 1) return tr(context, 'ahora', 'now');
      if (m < 60) return tr(context, 'hace $m min', '$m min ago');
      if (m < 1440) {
        return tr(context, 'hace ${m ~/ 60} h', '${m ~/ 60} h ago');
      }
      return tr(context, 'hace ${m ~/ 1440} d', '${m ~/ 1440} d ago');
    }

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setS) {
          final c = WfColors.of(ctx);

          if (!started) {
            started = true;
            repo.fetchComments(post.id).then((r) {
              if (ctx.mounted) setS(() { list = r; loading = false; });
            }).catchError((e) {
              if (ctx.mounted) setS(() { err = e.toString(); loading = false; });
            });
          }

          Future<void> send() async {
            final t = ctrl.text.trim();
            if (t.isEmpty || sending) return;
            setS(() { sending = true; err = null; });
            try {
              final cm = await repo.addComment(post.id, t);
              ctrl.clear();
              setS(() { list = [...list, cm]; sending = false; });
              if (mounted) {
                setState(() {
                  posts = [
                    for (final p in posts)
                      p.id == post.id
                          ? p.copyWith(commentCount: list.length)
                          : p,
                  ];
                });
              }
            } catch (e) {
              setS(() { err = e.toString(); sending = false; });
            }
          }

          return Padding(
            padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
            child: ConstrainedBox(
              constraints: BoxConstraints(
                maxHeight: MediaQuery.of(ctx).size.height * 0.85,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 10),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: c.chip,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: c.line),
                      ),
                      child: Text(
                        post.questionStatement ?? post.text,
                        maxLines: 4,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.inter(fontSize: 13, color: c.ink),
                      ),
                    ),
                  ),
                  Flexible(
                    child: loading
                        ? const Padding(
                            padding: EdgeInsets.all(24),
                            child: Center(child: CircularProgressIndicator()),
                          )
                        : list.isEmpty
                            ? Padding(
                                padding: const EdgeInsets.all(24),
                                child: Text(
                                  tr(ctx, 'Sé el primero en comentar.',
                                      'Be the first to comment.'),
                                  style: GoogleFonts.inter(
                                      fontSize: 13, color: c.muted),
                                ),
                              )
                            : ListView(
                                shrinkWrap: true,
                                padding:
                                    const EdgeInsets.symmetric(horizontal: 20),
                                children: [
                                  for (final cm in list)
                                    Padding(
                                      padding: const EdgeInsets.only(bottom: 12),
                                      child: Row(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          AvatarCircle(
                                            name: cm.authorName,
                                            color: cm.authorColor,
                                            size: 32,
                                          ),
                                          const SizedBox(width: 10),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  '${cm.authorName} · ${ago(cm.createdAt)}',
                                                  style: GoogleFonts.inter(
                                                    fontSize: 11,
                                                    fontWeight: FontWeight.w700,
                                                    color: c.muted,
                                                  ),
                                                ),
                                                const SizedBox(height: 2),
                                                Text(
                                                  cm.text,
                                                  style: GoogleFonts.inter(
                                                      fontSize: 13,
                                                      color: c.ink),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                ],
                              ),
                  ),
                  if (err != null)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 0, 20, 6),
                      child: Text(err!, style: TextStyle(color: c.danger)),
                    ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 6, 12, 16),
                    child: Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: ctrl,
                            minLines: 1,
                            maxLines: 3,
                            maxLength: 1000,
                            onSubmitted: (_) => send(),
                            decoration: InputDecoration(
                              counterText: '',
                              hintText: tr(ctx, 'Escribe tu comentario…',
                                  'Write your comment…'),
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        IconButton.filled(
                          style: IconButton.styleFrom(backgroundColor: _azul),
                          onPressed: sending ? null : send,
                          icon: sending
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Icon(Icons.send, size: 18),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    ).whenComplete(ctrl.dispose);
  }

  Widget _label(String text) => Padding(
    padding: const EdgeInsets.only(top: 22, bottom: 10),
    child: Text(
      text,
      style: GoogleFonts.montserrat(
        fontSize: 11,
        fontWeight: FontWeight.w700,
        letterSpacing: 0.8,
        color: WfColors.of(context).muted,
      ),
    ),
  );

  @override
  Widget build(BuildContext context) {
    final c = WfColors.of(context);
    final g = widget.group;
    final subject = testName(context, g.subjectTestId, g.subjectTestId.toUpperCase());
    final members = (details?['members'] as List? ?? [])
        .map((m) => Map<String, dynamic>.from(m as Map))
        .toList();
    final stats = details?['statistics'] as Map?;
    final accuracy = stats?['accuracy'] as num?;
    final count = (details?['memberCount'] as num?)?.toInt() ?? g.memberCount;

    return Scaffold(
      appBar: AppBar(),
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
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                  children: [
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: _azul,
                        borderRadius: BorderRadius.circular(18),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  g.name,
                                  style: GoogleFonts.montserrat(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w800,
                                    color: Colors.white,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  tr(context, '$subject · $count miembros',
                                      '$subject · $count members'),
                                  style: GoogleFonts.inter(
                                    fontSize: 12,
                                    color: Colors.white70,
                                  ),
                                ),
                                if ((details?['visibility'] ?? '') != '')
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
                                    style: GoogleFonts.inter(
                                      fontSize: 11,
                                      color: Colors.white54,
                                    ),
                                  ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          FilledButton(
                            style: FilledButton.styleFrom(
                              minimumSize: const Size(0, 40),
                              backgroundColor: Colors.white24,
                              foregroundColor: Colors.white,
                              padding:
                                  const EdgeInsets.symmetric(horizontal: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              textStyle: GoogleFonts.montserrat(
                                fontSize: 12,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            onPressed: _invite,
                            child: Text(tr(context, '+ Invitar miembros',
                                '+ Invite members')),
                          ),
                        ],
                      ),
                    ),
                    if ((details?['description'] ?? '').toString().isNotEmpty) ...[
                      const SizedBox(height: 10),
                      Text(
                        details!['description'].toString(),
                        style: GoogleFonts.inter(fontSize: 13, color: c.muted),
                      ),
                    ],
                    _label(tr(context, 'MIEMBROS', 'MEMBERS')),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          for (var i = 0; i < members.length; i++)
                            Padding(
                              padding: const EdgeInsets.only(right: 14),
                              child: Column(
                                children: [
                                  AvatarCircle(
                                    name: members[i]['name'].toString(),
                                    color: _palette[i % _palette.length],
                                    size: 44,
                                  ),
                                  const SizedBox(height: 4),
                                  SizedBox(
                                    width: 56,
                                    child: Text(
                                      members[i]['name'].toString(),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      textAlign: TextAlign.center,
                                      style: GoogleFonts.inter(
                                        fontSize: 10,
                                        color: c.muted,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: c.chip,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: c.line),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            tr(context, 'Promedio grupal', 'Group average'),
                            style: GoogleFonts.montserrat(
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                              color: c.ink,
                            ),
                          ),
                          const SizedBox(height: 10),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(6),
                            child: LinearProgressIndicator(
                              value: ((accuracy ?? 0) / 100).clamp(0.0, 1.0).toDouble(),
                              minHeight: 8,
                              backgroundColor: c.line,
                              color: _azul,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            accuracy == null
                                ? tr(context, 'Aún sin práctica del grupo',
                                    'No group practice yet')
                                : tr(
                                    context,
                                    '$accuracy% de aciertos · ${stats?['correct'] ?? 0} correctas de ${stats?['answered'] ?? 0} · no es puntaje PAES',
                                    '$accuracy% correct · ${stats?['correct'] ?? 0} of ${stats?['answered'] ?? 0} · not a PAES score',
                                  ),
                            style: GoogleFonts.inter(fontSize: 12, color: c.muted),
                          ),
                        ],
                      ),
                    ),
                    _label(tr(context, 'PREGUNTAS COMPARTIDAS', 'SHARED QUESTIONS')),
                    if (posts.isEmpty)
                      Text(
                        tr(context, 'Todavía no hay publicaciones.',
                            'No posts yet.'),
                        style: GoogleFonts.inter(fontSize: 13, color: c.muted),
                      ),
                    for (final post in posts)
                      Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: c.chip,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: c.line),
                        ),
                                                child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              post.authorName,
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: c.muted,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(post.text,
                                style: GoogleFonts.inter(fontSize: 13, color: c.ink)),
                            if (post.questionStatement != null) ...[
                              const SizedBox(height: 6),
                              Text(
                                post.questionStatement!,
                                style: GoogleFonts.inter(fontSize: 13, color: c.ink),
                              ),
                            ],
                            const SizedBox(height: 10),
                            Align(
                              alignment: Alignment.centerLeft,
                              child: InkWell(
                                borderRadius: BorderRadius.circular(20),
                                onTap: () => _comments(post),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 14, vertical: 8),
                                  decoration: BoxDecoration(
                                    color: _azul.withValues(alpha: 0.08),
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Text('💬',
                                          style: TextStyle(fontSize: 15)),
                                      const SizedBox(width: 8),
                                      Text(
                                        post.commentCount > 0
                                            ? tr(
                                                context,
                                                'Comentar (${post.commentCount})',
                                                'Comment (${post.commentCount})')
                                            : tr(context, 'Comentar', 'Comment'),
                                        style: GoogleFonts.montserrat(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w800,
                                          color: _azul,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    const SizedBox(height: 8),
                    Center(
                      child: TextButton(
                        onPressed: _leave,
                        child: Text(
                          tr(context, 'Salir del grupo', 'Leave group'),
                          style: GoogleFonts.montserrat(
                            fontWeight: FontWeight.w800,
                            color: _azul,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
    );
  }
}