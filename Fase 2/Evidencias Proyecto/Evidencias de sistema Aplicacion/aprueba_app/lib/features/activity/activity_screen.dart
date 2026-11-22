import '../../core/l10n/system_text.dart';
import '../../core/utils/tier_names.dart';
import '../../core/theme/wf_colors.dart';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/l10n/l10n.dart';
import '../../core/network/api_client.dart';
import '../../core/utils/format_utils.dart';
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
  Widget build(BuildContext context) {
    final c = WfColors.of(context),
        dark = Theme.of(context).brightness == Brightness.dark;
    final correctColor = dark
            ? const Color(0xFF6EE7B7)
            : const Color(0xFF047857),
        wrongColor = dark ? const Color(0xFFFDA4AF) : const Color(0xFFB91C1C);
    final answers = (data?.progress['recent'] as List?) ?? const [],
        ledger = (data?.medals['history'] as List?) ?? const [],
        benefits = (data?.medals['redemptions'] as List?) ?? const [];
    Widget panel(String label, IconData icon, List<Widget> children) => Padding(
      padding: const EdgeInsets.only(bottom: 18),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(icon, color: c.brand),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      label,
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              ...children,
            ],
          ),
        ),
      ),
    );
    return Scaffold(
      appBar: AppBar(
        leading: BackButton(
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/home');
            }
          },
        ),
        title: Text(tr(context, 'Tu actividad', 'Your activity')),
        actions: [
          IconButton(
            tooltip: tr(context, 'Actualizar actividad', 'Refresh activity'),
            onPressed: loading ? null : _load,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: loading && data == null
          ? const ContentSkeleton(kind: 'cards')
          : ListView(
              padding: const EdgeInsets.fromLTRB(16, 18, 16, 28),
              children: [
                Container(
                  padding: const EdgeInsets.all(24),
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF1A365D), Color(0xFF365A7C)],
                    ),
                    borderRadius: BorderRadius.circular(22),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        tr(
                          context,
                          'Cada intento cuenta',
                          'Every attempt counts',
                        ),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 25,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        tr(
                          context,
                          'Revisa tus respuestas, medallas y beneficios en un solo lugar.',
                          'Review your answers, medals and benefits in one place.',
                        ),
                        style: const TextStyle(
                          color: Color(0xFFE2EDF7),
                          height: 1.6,
                        ),
                      ),
                      if (answers.isNotEmpty) ...[
                        const SizedBox(height: 20),
                        Text(
                          tr(
                            context,
                            'En tus últimas ${answers.length} respuestas: ${answers.where((a) => a['isCorrect'] == true).length} correctas.',
                            'In your last ${answers.length} answers: ${answers.where((a) => a['isCorrect'] == true).length} correct.',
                          ),
                          style: const TextStyle(
                            color: Colors.white,
                            height: 1.6,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                if (loading)
                  const Padding(
                    padding: EdgeInsets.only(bottom: 18),
                    child: LinearProgressIndicator(),
                  ),
                if (error != null)
                  panel(
                    tr(context, 'No pudimos actualizar', 'Could not refresh'),
                    Icons.wifi_off_outlined,
                    [
                      Text(error!, style: TextStyle(color: c.ink)),
                      TextButton(
                        onPressed: _load,
                        child: Text(tr(context, 'Reintentar', 'Retry')),
                      ),
                    ],
                  ),
                panel(
                  tr(context, 'Últimas respuestas', 'Recent answers'),
                  Icons.fact_check_outlined,
                  [
                    if (answers.isEmpty)
                      Text(
                        tr(
                          context,
                          'Tus respuestas aparecerán aquí cuando comiences a practicar.',
                          'Your answers will appear here when you start practising.',
                        ),
                        style: TextStyle(color: c.muted, height: 1.6),
                      ),
                    for (final row in answers)
                      ListTile(
                        contentPadding: const EdgeInsets.symmetric(vertical: 6),
                        leading: CircleAvatar(
                          backgroundColor:
                              (row['isCorrect'] == true
                                      ? correctColor
                                      : wrongColor)
                                  .withValues(alpha: .12),
                          child: Icon(
                            row['isCorrect'] == true
                                ? Icons.check_rounded
                                : Icons.close_rounded,
                            color: row['isCorrect'] == true
                                ? correctColor
                                : wrongColor,
                          ),
                        ),
                        title: Text(
                          testName(
                            context,
                            row['testId'].toString(),
                            {
                                  'm1': 'Matemática M1',
                                  'm2': 'Matemática M2',
                                  'lectora': 'Competencia Lectora',
                                  'cien': 'Ciencias',
                                  'hist': 'Historia',
                                }[row['testId']] ??
                                row['testId'].toString(),
                          ),
                        ),
                        subtitle: Text(
                          activityDate(context, row['answeredAt']),
                          style: TextStyle(color: c.muted, height: 1.6),
                        ),
                        trailing: Text(
                          row['isCorrect'] == true
                              ? tr(context, 'Correcta', 'Correct')
                              : tr(context, 'Incorrecta', 'Incorrect'),
                          style: TextStyle(
                            color: row['isCorrect'] == true
                                ? correctColor
                                : wrongColor,
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                  ],
                ),
                panel(
                  tr(context, 'Historial de medallas', 'Medal history'),
                  Icons.workspace_premium_outlined,
                  [
                    Text(
                      tr(
                        context,
                        'Tus últimos 50 movimientos.',
                        'Your latest 50 transactions.',
                      ),
                      style: TextStyle(color: c.muted),
                    ),
                    if (ledger.isEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 12),
                        child: Text(
                          tr(
                            context,
                            'Todavía no hay movimientos. Sigue practicando para ganar medallas.',
                            'No transactions yet. Keep practising to earn medals.',
                          ),
                          style: TextStyle(color: c.muted, height: 1.6),
                        ),
                      ),
                    for (final row in ledger)
                      ListTile(
                        contentPadding: const EdgeInsets.symmetric(vertical: 8),
                        leading: Icon(
                          Icons.military_tech_rounded,
                          color: c.brand,
                        ),
                        title: Text(
                          '${(row['amount'] as num) > 0 ? '+' : ''}${row['amount']} ${tierName(context, row['tier'].toString())}',
                          style: const TextStyle(fontWeight: FontWeight.w800),
                        ),
                        subtitle: Padding(
                          padding: const EdgeInsets.only(top: 6),
                          child: Text(
                            '${systemText(context, row['reason']?.toString() ?? '')}\n${activityDate(context, row['createdAt'])}',
                            style: TextStyle(color: c.muted, height: 1.6),
                          ),
                        ),
                      ),
                  ],
                ),
                panel(
                  tr(context, 'Solicitudes de beneficios', 'Benefit requests'),
                  Icons.redeem_outlined,
                  [
                    if (benefits.isEmpty)
                      Text(
                        tr(
                          context,
                          'Cuando solicites un beneficio, podrás revisar su estado aquí.',
                          'When you request a benefit, you can check its status here.',
                        ),
                        style: TextStyle(color: c.muted, height: 1.6),
                      ),
                    for (final row in benefits)
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(row['name'].toString()),
                        subtitle: Text(
                          '${tr(context, "Referencia", "Reference")}: ${row["id"]} · ${systemText(context, row["status"].toString())}',
                          style: TextStyle(color: c.muted),
                        ),
                      ),
                  ],
                ),
              ],
            ),
    );
  }
}
