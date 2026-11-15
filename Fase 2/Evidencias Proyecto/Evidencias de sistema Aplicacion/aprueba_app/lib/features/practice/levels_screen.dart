import '../../core/widgets/content_skeleton.dart';
import '../../core/theme/wf_colors.dart';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/l10n/l10n.dart';
import '../../core/network/api_client.dart';
import '../auth/auth_providers.dart';

class LevelsScreen extends ConsumerStatefulWidget {
  const LevelsScreen({super.key});
  @override
  ConsumerState<LevelsScreen> createState() => _LevelsState();
}

class _LevelsState extends ConsumerState<LevelsScreen> {
  String test = 'm1';
  late Future<List<dynamic>> levels;
  Future<List<dynamic>> load() async {
    final res = await ApiClient.dio.get(
      '/practice/levels',
      queryParameters: {'testId': test},
    );
    return res.data['data'] as List;
  }

  @override
  void initState() {
    super.initState();
    levels = load();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(tr(context, 'Niveles escalonados', 'Difficulty levels')),
    ),
    body: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          tr(
            context,
            'Consigue 20 aciertos por materia en el nivel anterior. Si no hay preguntas básicas, comienzas en el primer nivel con contenido.',
            'Get 20 correct answers per subject in the previous level. If basic questions are unavailable, start at the first level with content.',
          ),
        ),
        DropdownButtonFormField<String>(
          decoration: InputDecoration(labelText: tr(context, 'Prueba', 'Test')),
          initialValue: test,
          items: const [
            DropdownMenuItem(value: 'm1', child: Text('M1')),
            DropdownMenuItem(value: 'm2', child: Text('M2')),
            DropdownMenuItem(
              value: 'lectora',
              child: Text('Lectora / Reading'),
            ),
            DropdownMenuItem(value: 'cien', child: Text('Ciencias / Science')),
            DropdownMenuItem(value: 'hist', child: Text('Historia / History')),
          ],
          onChanged: (value) => setState(() {
            test = value!;
            levels = load();
          }),
        ),
        FutureBuilder<List<dynamic>>(
          future: levels,
          builder: (context, snapshot) {
            if (snapshot.hasError) {
              return Text(
                tr(
                  context,
                  'No se pudieron cargar los niveles.',
                  'Could not load levels.',
                ),
              );
            }
            if (snapshot.connectionState == ConnectionState.waiting ||
                !snapshot.hasData) {
              return const ContentSkeleton(kind: 'levels', inline: true);
            }
            return Column(
              children: [
                for (final level in snapshot.data!)
                  Card(
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(18),
                      side: BorderSide(color: WfColors.of(context).line),
                    ),
                    child: ListTile(
                      contentPadding: const EdgeInsets.all(16),
                      trailing:
                          level['unlocked'] == true &&
                              (level['available'] as num) > 0
                          ? const Icon(Icons.arrow_forward_rounded)
                          : null,
                      leading: Icon(
                        level['unlocked'] == true
                            ? Icons.lock_open
                            : Icons.lock,
                      ),
                      title: Text(
                        level['id'] == 'd1'
                            ? tr(context, 'Básica', 'Basic')
                            : level['id'] == 'd2'
                            ? tr(context, 'Intermedia', 'Intermediate')
                            : tr(context, 'Avanzada', 'Advanced'),
                      ),
                      subtitle: Text(
                        tr(
                          context,
                          "${level['correct']} aciertos · ${level['available']} preguntas",
                          "${level['correct']} correct · ${level['available']} questions",
                        ),
                      ),
                      onTap:
                          level['unlocked'] == true &&
                              (level['available'] as num) > 0
                          ? () async {
                              await ApiClient.dio.patch(
                                '/auth/me',
                                data: {
                                  'selectedTests': [test],
                                  'difficulty': level['id'],
                                },
                              );
                              await ref
                                  .read(profileProvider.notifier)
                                  .refresh();
                              if (context.mounted) context.go('/practice');
                            }
                          : null,
                    ),
                  ),
              ],
            );
          },
        ),
      ],
    ),
  );
}
