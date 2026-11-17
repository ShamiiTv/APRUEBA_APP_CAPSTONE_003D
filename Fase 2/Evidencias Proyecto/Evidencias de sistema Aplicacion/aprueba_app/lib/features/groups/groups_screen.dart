import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/l10n/l10n.dart';
import '../../core/theme/wf_colors.dart';
import '../../core/utils/test_colors.dart';
import '../../core/utils/tier_names.dart';
import '../../core/widgets/content_skeleton.dart';
import '../../data/social_models.dart';
import 'groups_providers.dart';

final publicGroupsProvider = FutureProvider.autoDispose<List<StudyGroup>>(
  (ref) => ref.read(groupsRepositoryProvider).publicGroups(),
);

class GroupsScreen extends ConsumerWidget {
  const GroupsScreen({super.key});

  static const _azul = Color(0xFF1A365D);

  Future<void> _join(BuildContext context, WidgetRef ref) async {
    final control = TextEditingController();
    String? error;
    bool busy = false;

    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => StatefulBuilder(
        builder: (ctx, setDialog) {
          final c = WfColors.of(ctx);

          Future<void> submit() async {
            final code = control.text.trim();
            if (code.isEmpty) {
              setDialog(
                () => error = tr(
                  ctx,
                  'Pega el enlace o el código del grupo.',
                  'Paste the group link or code.',
                ),
              );
              return;
            }
            setDialog(() {
              busy = true;
              error = null;
            });
            try {
              await ref.read(groupsRepositoryProvider).acceptInvitation(code);
              ref.invalidate(groupsProvider);
              ref.invalidate(publicGroupsProvider);
              if (ctx.mounted) Navigator.of(ctx).pop();
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                      tr(
                        context,
                        'Te uniste al grupo ✓',
                        'You joined the group ✓',
                      ),
                    ),
                  ),
                );
              }
            } catch (e) {
              setDialog(() {
                busy = false;
                error = e.toString();
              });
            }
          }

          return Dialog(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(22),
            ),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(22, 22, 22, 14),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    tr(ctx, 'Unirme a un grupo', 'Join a group'),
                    style: GoogleFonts.montserrat(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: c.ink,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    tr(
                      ctx,
                      'Pega el enlace o el código completo que te compartieron.',
                      'Paste the link or full code you were given.',
                    ),
                    style: GoogleFonts.inter(fontSize: 13, color: c.muted),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: control,
                    enabled: !busy,
                    autofocus: true,
                    onSubmitted: (_) => submit(),
                    decoration: InputDecoration(
                      prefixIcon: const Icon(Icons.link),
                      hintText: tr(
                        ctx,
                        'Enlace o código del grupo',
                        'Group link or code',
                      ),
                    ),
                  ),
                  if (error != null) ...[
                    const SizedBox(height: 10),
                    Text(
                      error!,
                      style: GoogleFonts.inter(fontSize: 12, color: c.danger),
                    ),
                  ],
                  const SizedBox(height: 18),
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: FilledButton(
                      style: FilledButton.styleFrom(
                        backgroundColor: const Color(0xFFF5AF41),
                        foregroundColor: c.brand,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                        textStyle: GoogleFonts.montserrat(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      onPressed: busy ? null : submit,
                      child: busy
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: _azul,
                              ),
                            )
                          : Text(tr(ctx, 'Unirme', 'Join')),
                    ),
                  ),
                  Center(
                    child: TextButton(
                      onPressed: busy ? null : () => Navigator.of(ctx).pop(),
                      child: Text(
                        tr(ctx, 'Cancelar', 'Cancel'),
                        style: GoogleFonts.montserrat(
                          fontWeight: FontWeight.w800,
                          color: c.brand,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
    control.dispose();
  }

  Widget _groupCard(
    BuildContext context,
    StudyGroup group, {
    required VoidCallback onTap,
    Widget? trailing,
    bool showMembers = true,
  }) {
    final c = WfColors.of(context);
    final color = testDotColor(group.subjectTestId, group.subjectTestId, _azul);
    final subject = testName(
      context,
      group.subjectTestId,
      group.subjectTestId.toUpperCase(),
    );
    final initial = group.name.trim().isEmpty
        ? '?'
        : group.name.trim()[0].toUpperCase();
    final sub = showMembers
        ? tr(
            context,
            '$subject · ${group.memberCount} miembros',
            '$subject · ${group.memberCount} members',
          )
        : subject;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: c.chip,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: c.line),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Text(
                  initial,
                  style: GoogleFonts.montserrat(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      group.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.montserrat(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: c.ink,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      sub,
                      style: GoogleFonts.inter(fontSize: 12, color: c.muted),
                    ),
                  ],
                ),
              ),
              trailing ?? Icon(Icons.chevron_right, color: c.muted),
            ],
          ),
        ),
      ),
    );
  }

  Widget _sectionTitle(BuildContext context, String text) => Padding(
    padding: const EdgeInsets.only(top: 12, bottom: 12),
    child: Text(
      text,
      style: GoogleFonts.montserrat(
        fontSize: 20,
        fontWeight: FontWeight.w800,
        color: WfColors.of(context).ink,
      ),
    ),
  );

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = WfColors.of(context);
    return Scaffold(
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
                child: Text(
                  tr(
                    context,
                    'No se pudieron cargar tus grupos. Reintentar',
                    'Could not load your groups. Retry',
                  ),
                ),
              ),
            ),
            data: (groups) => ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        tr(context, 'Mis grupos', 'My groups'),
                        style: GoogleFonts.montserrat(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: c.ink,
                        ),
                      ),
                    ),
                    FilledButton.icon(
                      style: FilledButton.styleFrom(
                        minimumSize: const Size(0, 44),
                        backgroundColor: _azul,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                        textStyle: GoogleFonts.montserrat(
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      icon: const Icon(Icons.add, size: 18),
                      onPressed: () => context.push('/groups/create'),
                      label: Text(tr(context, 'Crear grupo', 'Create group')),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(double.infinity, 46),
                    foregroundColor: c.brand,
                    side: BorderSide(color: c.line),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                    textStyle: GoogleFonts.montserrat(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  icon: const Icon(Icons.link, size: 18),
                  onPressed: () => _join(context, ref),
                  label: Text(
                    tr(context, 'Unirme con código', 'Join with code'),
                  ),
                ),
                const SizedBox(height: 16),
                if (groups.isEmpty)
                  Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text(
                      tr(
                        context,
                        'Todavía no perteneces a un grupo.',
                        'You do not belong to a group yet.',
                      ),
                      textAlign: TextAlign.center,
                      style: GoogleFonts.inter(fontSize: 13, color: c.muted),
                    ),
                  ),
                for (final group in groups)
                  _groupCard(
                    context,
                    group,
                    onTap: () => context.push('/groups/detail', extra: group),
                  ),
                _sectionTitle(
                  context,
                  tr(context, 'Descubrir grupos públicos', 'Public groups'),
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
                            Builder(
                              builder: (context) {
                                final mine = groups
                                    .where((g) => g.id == group.id)
                                    .toList();
                                final isMine = mine.isNotEmpty;
                                return _groupCard(
                                  context,
                                  group,
                                  showMembers: false,
                                  onTap: isMine
                                      ? () => context.push(
                                          '/groups/detail',
                                          extra: mine.first,
                                        )
                                      : () {},
                                  trailing: TextButton(
                                    onPressed: isMine
                                        ? () => context.push(
                                            '/groups/detail',
                                            extra: mine.first,
                                          )
                                        : () async {
                                            try {
                                              await ref
                                                  .read(
                                                    groupsRepositoryProvider,
                                                  )
                                                  .acceptInvitation(group.id);
                                              ref.invalidate(groupsProvider);
                                              ref.invalidate(
                                                publicGroupsProvider,
                                              );
                                            } catch (e) {
                                              if (context.mounted) {
                                                ScaffoldMessenger.of(
                                                  context,
                                                ).showSnackBar(
                                                  SnackBar(
                                                    content: Text(e.toString()),
                                                  ),
                                                );
                                              }
                                            }
                                          },
                                    child: Text(
                                      isMine
                                          ? tr(context, 'Abrir', 'Open')
                                          : tr(context, 'Unirme', 'Join'),
                                      style: GoogleFonts.montserrat(
                                        fontWeight: FontWeight.w800,
                                        color: c.brand,
                                      ),
                                    ),
                                  ),
                                );
                              },
                            ),
                        ],
                      ),
                    ),
              ],
            ),
          ),
    );
  }
}
