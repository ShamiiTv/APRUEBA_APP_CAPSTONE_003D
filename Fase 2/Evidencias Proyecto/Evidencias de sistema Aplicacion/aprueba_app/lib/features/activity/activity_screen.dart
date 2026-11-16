import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/l10n/l10n.dart';
import '../../core/network/api_client.dart';
import '../../core/widgets/content_skeleton.dart';

class ActivityRepository {
  Future<({Map<String, dynamic> medals, Map<String, dynamic> progress})>
  fetch() async {
    final data = await Future.wait([
      ApiClient.dio.get('/medals'),
      ApiClient.dio.get('/progress'),
    ]);
    return (
      medals: Map<String, dynamic>.from(data[0].data['data']),
      progress: Map<String, dynamic>.from(data[1].data['data']),
    );
  }
}

final activityRepositoryProvider = Provider((ref) => ActivityRepository());

class ActivityScreen extends ConsumerStatefulWidget {
  const ActivityScreen({super.key});
  @override
  ConsumerState<ActivityScreen> createState() => _ActivityState();
}

class _ActivityState extends ConsumerState<ActivityScreen> {
  ({Map<String, dynamic> medals, Map<String, dynamic> progress})? data;
  String? error;
  bool loading = true;
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => loading = true);
    try {
      final result = await ref.read(activityRepositoryProvider).fetch();
      if (mounted) {
        setState(() {
          data = result;
          error = null;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(
          () => error = tr(
            context,
            'No se pudo cargar tu historial.',
            'Could not load your history.',
          ),
        );
      }
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(tr(context, 'Tu actividad', 'Your activity')),
      actions: [
        IconButton(
          onPressed: loading ? null : _load,
          icon: const Icon(Icons.refresh),
        ),
      ],
    ),
    body: loading
        ? const ContentSkeleton(kind: 'cards')
        : ListView(
            padding: const EdgeInsets.all(16),
            children: [
              if (error != null) ...[
                Text(error!),
                TextButton(
                  onPressed: _load,
                  child: Text(tr(context, 'Reintentar', 'Retry')),
                ),
              ],
              if (data != null) ...[
                Text(
                  tr(context, 'Últimas respuestas', 'Recent answers'),
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                if ((data!.progress['recent'] as List).isEmpty)
                  Text(
                    tr(context, 'Aún no tienes respuestas.', 'No answers yet.'),
                  ),
                for (final row in data!.progress['recent'] as List)
                  ListTile(
                    title: Text(row['testId'].toString().toUpperCase()),
                    subtitle: Text('${row['answeredAt']}'),
                    leading: Icon(
                      row['isCorrect'] == true
                          ? Icons.check_circle
                          : Icons.cancel,
                    ),
                    trailing: Text(
                      row['isCorrect'] == true
                          ? tr(context, 'Correcta', 'Correct')
                          : tr(context, 'Incorrecta', 'Incorrect'),
                    ),
                  ),
                Text(
                  tr(context, 'Historial de medallas', 'Medal history'),
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                Text(
                  tr(
                    context,
                    'Últimos 50 movimientos.',
                    'Latest 50 transactions.',
                  ),
                ),
                if ((data!.medals['history'] as List).isEmpty)
                  Text(
                    tr(
                      context,
                      'Aún no tienes movimientos.',
                      'No transactions yet.',
                    ),
                  ),
                for (final row in data!.medals['history'] as List)
                  ListTile(
                    title: Text(
                      '${(row['amount'] as num) > 0 ? '+' : ''}${row['amount']} ${row['tier']}',
                    ),
                    subtitle: Text(
                      '${row['reason']}\n${row['createdAt'] ?? ''}',
                    ),
                  ),
                Text(
                  tr(context, 'Solicitudes de beneficios', 'Benefit requests'),
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                if ((data!.medals['redemptions'] as List).isEmpty)
                  Text(
                    tr(
                      context,
                      'Aún no tienes solicitudes.',
                      'No requests yet.',
                    ),
                  ),
                for (final row in data!.medals['redemptions'] as List)
                  ListTile(
                    title: Text(row['name'].toString()),
                    subtitle: Text(
                      '${tr(context, 'Referencia', 'Reference')}: ${row['id']} · ${row['status']}',
                    ),
                  ),
              ],
            ],
          ),
  );
}
