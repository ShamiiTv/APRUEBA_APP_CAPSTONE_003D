import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/l10n/l10n.dart';
import '../../core/network/api_error.dart';
import '../../core/theme/wf_colors.dart';
import '../../core/utils/format_utils.dart';
import '../../data/notification_models.dart';
import 'notifications_providers.dart';

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  Future<void> _open(WidgetRef ref, AppNotification n) async {
    if (n.read) return;
    try {
      await ref.read(notificationsRepositoryProvider).markRead(n.id);
    } on ApiFailure {
      // Si falla no es crítico: la próxima carga mostrará el estado real.
    }
    ref.invalidate(notificationsProvider);
  }

  Future<void> _markAll(WidgetRef ref, List<AppNotification> items) async {
    for (final n in items.where((n) => !n.read)) {
      try {
        await ref.read(notificationsRepositoryProvider).markRead(n.id);
      } on ApiFailure {
        break;
      }
    }
    ref.invalidate(notificationsProvider);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = WfColors.of(context);
    final data = ref.watch(notificationsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(tr(context, 'Notificaciones', 'Notifications')),
        leading: BackButton(onPressed: () => context.pop()),
        actions: [
          if ((data.value?.unread ?? 0) > 0)
            TextButton(
              onPressed: () => _markAll(ref, data.value!.items),
              child: Text(tr(context, 'Marcar todas', 'Mark all')),
            ),
        ],
      ),
      body: data.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  e is ApiFailure
                      ? e.message
                      : tr(
                          context,
                          'No se pudieron cargar las notificaciones.',
                          'Could not load notifications.',
                        ),
                  textAlign: TextAlign.center,
                  style: TextStyle(color: c.danger),
                ),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: () => ref.invalidate(notificationsProvider),
                  child: Text(tr(context, 'Reintentar', 'Retry')),
                ),
              ],
            ),
          ),
        ),
        data: (d) {
          if (d.items.isEmpty) {
            return Center(
              child: Text(
                tr(
                  context,
                  'No tienes notificaciones.',
                  'You have no notifications.',
                ),
                style: GoogleFonts.inter(fontSize: 13, color: c.muted),
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(notificationsProvider),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
              children: [
                for (final n in d.items)
                  InkWell(
                    onTap: () => _open(ref, n),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        border: Border(bottom: BorderSide(color: c.line)),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(n.emoji, style: const TextStyle(fontSize: 22)),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  n.title,
                                  style: GoogleFonts.inter(
                                    fontSize: 13,
                                    fontWeight: n.read
                                        ? FontWeight.w500
                                        : FontWeight.w800,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  n.body,
                                  style: GoogleFonts.inter(
                                    fontSize: 12,
                                    color: c.muted,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  timeAgo(n.createdAt),
                                  style: GoogleFonts.inter(
                                    fontSize: 10,
                                    color: c.muted,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (!n.read)
                            Container(
                              width: 9,
                              height: 9,
                              margin: const EdgeInsets.only(top: 4),
                              decoration: BoxDecoration(
                                color: c.brand,
                                shape: BoxShape.circle,
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}
