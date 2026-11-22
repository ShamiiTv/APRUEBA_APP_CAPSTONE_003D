import '../../core/widgets/aprueba_symbols.dart';
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';

import '../../core/l10n/l10n.dart';
import '../../core/network/api_client.dart';
import '../../core/theme/wf_colors.dart';
import '../auth/auth_providers.dart';
import '../practice/practice_providers.dart';

class ArenaRepository {
  Future<Map<String, dynamic>> state() async => Map<String, dynamic>.from(
    (await ApiClient.dio.get('/arena')).data['data'],
  );
  Future<String> updates(String cursor, CancelToken cancel) async =>
      (await ApiClient.dio.get(
            '/arena/updates',
            queryParameters: {'cursor': cursor},
            cancelToken: cancel,
          )).data['data']['cursor']
          as String;
  Future<void> command(
    String path, [
    Map<String, dynamic> body = const {},
  ]) async {
    await ApiClient.dio.post('/arena$path', data: body);
  }

  Future<Map<String, dynamic>> match(String id) async =>
      Map<String, dynamic>.from(
        (await ApiClient.dio.get('/arena/matches/$id')).data['data'],
      );
}

final arenaRepositoryProvider = Provider((ref) => ArenaRepository());

class ArenaScreen extends ConsumerStatefulWidget {
  const ArenaScreen({super.key});
  @override
  ConsumerState<ArenaScreen> createState() => _ArenaScreenState();
}

class _ArenaScreenState extends ConsumerState<ArenaScreen>
    with WidgetsBindingObserver {
  Map<String, dynamic>? data, view;
  String testId = 'm1',
      choice = '',
      questionId = '',
      errorCode = '',
      hiddenMatch = '',
      lastAppliedMatch = '';
  bool busy = false, loading = false, foreground = true;
  Timer? poll, clock;
  final updateCancel = CancelToken();
  bool listening = false;
  String cursor = '';
  Future<void> listenUpdates() async {
    if (listening) return;
    listening = true;
    try {
      while (mounted && foreground) {
        try {
          cursor = await ref
              .read(arenaRepositoryProvider)
              .updates(cursor, updateCancel);
          if (mounted && foreground) await refresh();
        } catch (e) {
          if (!mounted || updateCancel.isCancelled) break;
          setState(() => errorCode = _error(e));
          await Future<void>.delayed(const Duration(milliseconds: 2500));
        }
      }
    } finally {
      listening = false;
    }
  }

  int offset = 0;
  String t(String es, String en) => tr(context, es, en);
  Map<String, dynamic>? get match {
    final candidate = data?['match'];
    return view ??
        (candidate is Map && candidate['id'] != hiddenMatch
            ? Map<String, dynamic>.from(candidate)
            : null);
  }

  bool get active =>
      data?['match'] != null && data?['match']['phase'] != 'finished';
  bool get queued => data?['seat']?['phase'] == 'queue';
  int get now => DateTime.now().millisecondsSinceEpoch + offset;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    Future.microtask(refresh);
    Future.microtask(listenUpdates);
    poll = Timer.periodic(const Duration(seconds: 10), (_) {
      if (foreground) {
        refresh();
        listenUpdates();
      }
    });
    clock = Timer.periodic(const Duration(milliseconds: 250), (_) {
      if (mounted && foreground) setState(() {});
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    updateCancel.cancel();
    poll?.cancel();
    clock?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    foreground = state == AppLifecycleState.resumed;
    if (foreground) {
      refresh();
      listenUpdates();
    }
  }

  Future<void> refresh() async {
    if (loading || !mounted) return;
    loading = true;
    try {
      final next = await ref.read(arenaRepositoryProvider).state();
      if (!mounted) return;

      setState(() {
        data = next;
        offset =
            (next['serverNow'] as num).toInt() -
            DateTime.now().millisecondsSinceEpoch;
        errorCode = '';
        final q = match?['question']?['id'] ?? '';
        if (q != questionId) {
          questionId = q;
          choice = '';
        }
      });
      if (next['match']?['phase'] == 'finished' &&
          next['match']['id'] != lastAppliedMatch) {
        lastAppliedMatch = next['match']['id'];
        ref.invalidate(progressSnapshotProvider);
        ref.invalidate(progressProvider);
        ref.read(profileProvider.notifier).refresh();
      }
    } catch (e) {
      if (mounted) setState(() => errorCode = _error(e));
    } finally {
      loading = false;
    }
  }

  String _error(Object e) {
    if (e is DioException) {
      final d = e.response?.data;
      final err = d is Map ? d['error'] : null;
      final details = err is Map ? err['details'] : null;
      return details is Map
          ? details['code']?.toString() ?? 'ARENA_UNAVAILABLE'
          : 'ARENA_UNAVAILABLE';
    }
    return 'ARENA_UNAVAILABLE';
  }

  String get error => switch (errorCode) {
    'ARENA_FORBIDDEN' => t(
      'Este duelo pertenece a otros jugadores.',
      'This match belongs to other players.',
    ),
    'ARENA_NOT_FOUND' => t(
      'El duelo no está disponible.',
      'This match is not available.',
    ),
    'ARENA_QUEUE_FULL' => t(
      'La cola está completa. Intenta en unos minutos.',
      'The queue is full. Try again in a few minutes.',
    ),
    'ARENA_ACCOUNT_DELETING' => t(
      'Tu cuenta está en proceso de eliminación.',
      'Your account is being deleted.',
    ),
    'ARENA_INCONSISTENT' => t(
      'La partida requiere revisión. No vuelvas a reservar una entrada.',
      'This match needs review. Do not reserve another entry.',
    ),
    'ARENA_BALANCE' => t(
      'Necesitas una medalla de bronce disponible.',
      'You need one available bronze medal.',
    ),
    'ARENA_DAILY_LIMIT' => t(
      'Ya jugaste las cinco partidas de hoy.',
      'You have played today’s five matches.',
    ),
    'ARENA_DISABLED' => t(
      'Arena estará disponible pronto.',
      'Arena will be available soon.',
    ),
    'ARENA_ANSWER_EXPIRED' => t(
      'La ronda terminó. Tu respuesta no fue enviada.',
      'The round ended. Your answer was not submitted.',
    ),
    'ARENA_ALREADY_ANSWERED' => t(
      'Ya enviaste una respuesta.',
      'You have already submitted an answer.',
    ),
    _ => t(
      'No se pudo actualizar Arena. Estamos recuperando el estado de tu partida.',
      'Could not refresh Arena. We are recovering your match state.',
    ),
  };
  Future<bool> act(String path, [Map<String, dynamic> body = const {}]) async {
    if (busy) return false;
    setState(() {
      busy = true;
      errorCode = '';
    });
    try {
      await ref.read(arenaRepositoryProvider).command(path, body);
      view = null;
      await refresh();
      return true;
    } catch (e) {
      if (mounted) setState(() => errorCode = _error(e));
      return false;
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  String name(String id) => id == 'm1'
      ? t('Matemática M1', 'Mathematics M1')
      : t('Matemática M2', 'Mathematics M2');
  String rank(num rating, num games) {
    if (games < 5) return t('En clasificación', 'Provisional');
    return rating < 1100
        ? t('Aspirante', 'Aspirant')
        : rating < 1300
        ? t('Explorador', 'Explorer')
        : rating < 1600
        ? t('Estratega', 'Strategist')
        : t('Maestro', 'Master');
  }

  String alias(dynamic value) => value == 'deleted'
      ? t('Cuenta eliminada', 'Deleted account')
      : value.toString();
  String reason(String? code) => switch (code) {
    'completed' => t('Partida completada', 'Match completed'),
    'abandon' => t('Partida resuelta por abandono', 'Match decided by forfeit'),
    'disconnect' => t(
      'Partida resuelta por desconexión',
      'Match decided by disconnect',
    ),
    'both_disconnected' => t(
      'Ambos se desconectaron. Entradas devueltas.',
      'Both players disconnected. Entries refunded.',
    ),
    'server_failure' => t(
      'Interrupción del servidor. Entradas y cupo diario devueltos.',
      'Server interruption. Entries and daily allowance refunded.',
    ),
    'not_ready' => t(
      'No confirmaron ambos. No se cobró a nadie.',
      'Both players did not confirm. Nobody was charged.',
    ),
    'unavailable' => t(
      'No se pudieron reservar ambas entradas. Sin cobro.',
      'Both entries could not be reserved. Nobody was charged.',
    ),
    _ => t('Partida cancelada sin coste.', 'Match cancelled at no cost.'),
  };
  Widget card(List<Widget> children) => Container(
    width: double.infinity,
    margin: const EdgeInsets.only(bottom: 18),
    padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(
      color: WfColors.of(context).bg,
      borderRadius: BorderRadius.circular(20),
      border: Border.all(color: WfColors.of(context).line),
    ),
    child: Material(
      type: MaterialType.transparency,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: children,
      ),
    ),
  );
  Widget title(String text) => Padding(
    padding: const EdgeInsets.only(bottom: 14),
    child: Text(
      text,
      style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
    ),
  );
  Widget paragraph(String text) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: Text(
      text,
      style: TextStyle(color: WfColors.of(context).muted, height: 1.6),
    ),
  );
  Widget button(String text, VoidCallback? action, {bool secondary = false}) =>
      Padding(
        padding: const EdgeInsets.only(top: 12),
        child: SizedBox(
          width: double.infinity,
          child: secondary
              ? OutlinedButton(
                  onPressed: busy ? null : action,
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Text(text, textAlign: TextAlign.center),
                  ),
                )
              : FilledButton(
                  onPressed: busy ? null : action,
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFFF5B33E),
                    foregroundColor: const Color(0xFF192A44),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Text(text, textAlign: TextAlign.center),
                  ),
                ),
        ),
      );
  Future<bool> confirmLeave() async =>
      await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text(t('¿Abandonar el duelo?', 'Forfeit this match?')),
          content: Text(
            t(
              'Perderás tu entrada y el rival recibirá el pozo.',
              'You will lose your entry and your opponent will receive the pot.',
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: Text(t('Seguir jugando', 'Keep playing')),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: Text(t('Abandonar', 'Forfeit')),
            ),
          ],
        ),
      ) ??
      false;
  Future<void> back() async {
    if (busy) return;
    if (active && data?['match']['phase'] == 'live' && !await confirmLeave()) {
      return;
    }
    if ((active || queued) && !await act('/cancel')) return;
    if (mounted) context.go('/home');
  }

  @override
  Widget build(BuildContext context) {
    final c = WfColors.of(context), m = match;
    return PopScope(
      canPop: !active && !queued,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) back();
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Arena'),
          leading: IconButton(
            onPressed: back,
            icon: const Icon(Icons.arrow_back),
          ),
        ),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                margin: const EdgeInsets.only(bottom: 20),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF172E55), Color(0xFF473384)],
                  ),
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(ApruebaSymbols.duel, color: Color(0xffffca69), size: 32),
                    const Text(
                      'ARENA APRUEBA',
                      style: TextStyle(
                        color: Color(0xFFFFCA69),
                        letterSpacing: 2,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      t(
                        'Tu conocimiento entra en juego.',
                        'Put your knowledge in play.',
                      ),
                      style: const TextStyle(
                        fontSize: 27,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      t(
                        'Un rival real. Las mismas cinco preguntas.',
                        'A real opponent. The same five questions.',
                      ),
                      style: const TextStyle(
                        color: Color(0xFFE3E3F3),
                        height: 1.5,
                      ),
                    ),
                  ],
                ),
              ),
              if (errorCode.isNotEmpty)
                card([
                  Text(error, semanticsLabel: error),
                  button(t('Reintentar', 'Retry'), refresh, secondary: true),
                ]),
              if (data == null) ...[
                for (var i = 0; i < 3; i++)
                  Container(
                    height: 90,
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: c.soft,
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: const Center(child: LinearProgressIndicator()),
                  ),
              ] else ...[
                card([
                  Wrap(
                    spacing: 24,
                    runSpacing: 16,
                    children: [
                      Text(
                        '◉ ${data!['balance']} ${t('bronce disponibles', 'bronze available')}',
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 18,
                        ),
                      ),
                      Text(
                        '${data!['dailyUsed']} / 5 ${t('partidas hoy', 'matches today')}',
                        style: TextStyle(color: c.muted),
                      ),
                    ],
                  ),
                ]),
                if (m != null)
                  _match(m)
                else if (queued)
                  card([
                    const Center(child: CircularProgressIndicator()),
                    const SizedBox(height: 20),
                    title(t('Buscando rival…', 'Finding an opponent…')),
                    paragraph(
                      '${name(data!['seat']['testId'])} · ${t('Entrada', 'Entry')} ◉ 1',
                    ),
                    paragraph(
                      t(
                        'Buscar es gratis. Aún no se ha descontado ninguna medalla.',
                        'Searching is free. No medals have been deducted.',
                      ),
                    ),
                    paragraph(
                      '${((now - (data!['seat']['joinedAt'] as num)) / 1000).floor().clamp(0, 9999)} s',
                    ),
                    if (now - (data!['seat']['joinedAt'] as num) > 60000)
                      paragraph(
                        t(
                          'Todavía no hay un rival compatible. Puedes esperar o cancelar.',
                          'No compatible opponent yet. You can wait or cancel.',
                        ),
                      ),
                    button(
                      t('Cancelar búsqueda', 'Cancel search'),
                      () => act('/cancel'),
                      secondary: true,
                    ),
                  ])
                else
                  card([
                    title(t('Elige tu desafío', 'Choose your challenge')),
                    paragraph(
                      t(
                        'Cinco preguntas · 60 segundos por ronda',
                        'Five questions · 60 seconds per round',
                      ),
                    ),
                    for (final test in data!['tests'])
                      Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: OutlinedButton(
                          onPressed: busy || test['available'] != true
                              ? null
                              : () => setState(() => testId = test['id']),
                          style: OutlinedButton.styleFrom(
                            side: BorderSide(
                              color: testId == test['id']
                                  ? const Color(0xFFAB82EE)
                                  : c.line,
                              width: testId == test['id'] ? 2 : 1,
                            ),
                            padding: const EdgeInsets.all(18),
                          ),
                          child: Align(
                            alignment: Alignment.centerLeft,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  name(test['id']),
                                  style: TextStyle(
                                    color: c.ink,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  '${test['rating']} · ${rank(test['rating'], test['games'])}',
                                  style: TextStyle(color: c.muted),
                                ),
                                if (test['available'] != true)
                                  Text(t('Próximamente', 'Coming soon')),
                              ],
                            ),
                          ),
                        ),
                      ),
                    paragraph(
                      t(
                        'Cada jugador aporta ◉ 1. El ganador recibe ◉ 2.',
                        'Each player contributes ◉ 1. The winner receives ◉ 2.',
                      ),
                    ),
                    paragraph(
                      t(
                        'Si pierdes, pierdes tu entrada. En empate se devuelve a ambos. Las medallas no se compran.',
                        'If you lose, you lose your entry. A draw refunds both players. Medals cannot be purchased.',
                      ),
                    ),
                    button(
                      t(
                        'Buscar rival · Entrada ◉ 1',
                        'Find opponent · Entry ◉ 1',
                      ),
                      data!['balance'] < 1 ||
                              data!['dailyUsed'] >= 5 ||
                              !(data!['tests'] as List).any(
                                (v) =>
                                    v['id'] == testId && v['available'] == true,
                              )
                          ? null
                          : () => act('/search', {'testId': testId}),
                    ),
                    paragraph(
                      t(
                        'Otras pruebas y entradas mayores estarán disponibles después de validar su banco y disponibilidad de rivales.',
                        'Other tests and higher entries will open after validating their question pools and opponent availability.',
                      ),
                    ),
                  ]),
                card([
                  ExpansionTile(
                    tilePadding: EdgeInsets.zero,
                    title: Text(t('Cómo funciona Arena', 'How Arena works')),
                    children: [
                      paragraph(
                        t(
                          'Buscamos un nivel similar y evitamos repetir rival en la misma prueba durante 24 horas.',
                          'We look for similar ratings and avoid repeat opponents in the same test for 24 hours.',
                        ),
                      ),
                      paragraph(
                        t(
                          'Un acierto suma un punto. Error o ronda sin responder: cero. Gana quien tenga más aciertos; no se desempata por velocidad.',
                          'One point per correct answer. Wrong or missing answer: zero. Most correct answers wins; no speed tiebreakers.',
                        ),
                      ),
                      paragraph(
                        t(
                          'Puedes reconectarte durante 30 segundos; el reloj continúa. Abandonar o no volver es derrota. Si ambos se desconectan, se devuelven las entradas y cuenta la partida diaria.',
                          'You have 30 seconds to reconnect; the clock continues. Forfeiting or not returning is a loss. If both disconnect, entries are refunded and the match counts for the daily limit.',
                        ),
                      ),
                      paragraph(
                        t(
                          'Máximo cinco partidas al día de Chile. Rango competitivo, no puntaje PAES. Arena no altera tu práctica ni cuota. Se priorizan preguntas no vistas, aunque pueden repetirse preguntas conocidas.',
                          'Up to five matches per Chilean day. A competitive rating, not a PAES score. Arena does not affect practice or quota. Unseen questions are preferred, but familiar questions may appear.',
                        ),
                      ),
                    ],
                  ),
                ]),
                if ((data!['history'] as List).isNotEmpty)
                  card([
                    title(t('Tus últimos duelos', 'Your recent matches')),
                    for (final h in data!['history'])
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(
                          '${name(h['testId'])} · ${alias(h['opponent'])}',
                        ),
                        subtitle: Text(
                          '${MaterialLocalizations.of(context).formatMediumDate(DateTime.fromMillisecondsSinceEpoch(h['finishedAt']))} · ${h['ratingDelta'] > 0 ? '+' : ''}${h['ratingDelta']} ${t('rango', 'rating')}',
                        ),
                        trailing: Text(
                          '${h['net'] > 0 ? '+' : ''}${h['net']} ◉',
                        ),
                        enabled: !active && !queued,
                        onTap: () async {
                          try {
                            final result = await ref
                                .read(arenaRepositoryProvider)
                                .match(h['matchId']);
                            if (mounted) setState(() => view = result);
                          } catch (e) {
                            if (mounted) setState(() => errorCode = _error(e));
                          }
                        },
                      ),
                  ]),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _match(Map<String, dynamic> m) {
    final me = m['me'] as int,
        players = m['players'] as List,
        phase = m['phase'],
        q = m['question'];
    final start = m['roundStartsAt'] ?? 0, deadline = m['deadline'] ?? 0;
    final seconds = (((now < start ? start : deadline) - now) / 1000)
        .ceil()
        .clamp(0, 60);
    return card([
      title(name(m['testId'])),
      paragraph(t('Entrada ◉ 1 · Pozo ◉ 2', 'Entry ◉ 1 · Pot ◉ 2')),
      Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (var i = 0; i < 2; i++)
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(12),
                margin: const EdgeInsets.all(3),
                decoration: BoxDecoration(
                  color: WfColors.of(context).soft,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: i == me
                        ? const Color(0xFFAB82EE)
                        : WfColors.of(context).line,
                  ),
                ),
                child: Column(
                  children: [
                    const Icon(Icons.person_outline, size: 32),
                    const SizedBox(height: 8),
                    Text(
                      '${alias(players[i]['alias'])}${i == me ? t(' · Tú', ' · You') : ''}',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '${players[i]['rating']} · ${rank(players[i]['rating'], players[i]['games'])}',
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 11),
                    ),
                    if (phase == 'live')
                      Text(
                        players[i]['answered'] == true
                            ? t('Respuesta enviada', 'Answer submitted')
                            : players[i]['connected'] == true
                            ? t('En juego', 'Playing')
                            : t('Reconectando…', 'Reconnecting…'),
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 11),
                      ),
                  ],
                ),
              ),
            ),
        ],
      ),
      const SizedBox(height: 22),
      if (phase == 'ready') ...[
        title(t('¡Rival encontrado!', 'Opponent found!')),
        paragraph(
          t(
            'Ambos deben confirmar. Solo entonces se reserva una medalla de cada jugador.',
            'Both players must confirm. Only then is one medal reserved from each player.',
          ),
        ),
        Text(
          '$seconds s',
          style: const TextStyle(fontSize: 38, fontWeight: FontWeight.w800),
        ),
        button(
          players[me]['ready'] == true
              ? t('Esperando al rival…', 'Waiting for opponent…')
              : t('Estoy listo · Entrada ◉ 1', 'I’m ready · Entry ◉ 1'),
          players[me]['ready'] == true
              ? null
              : () => act('/matches/${m['id']}/accept'),
        ),
        button(
          t('Cancelar sin coste', 'Cancel at no cost'),
          () => act('/cancel'),
          secondary: true,
        ),
      ],
      if (phase == 'live') ...[
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('${t('Ronda', 'Round')} ${m['round'] + 1} / 5'),
            Text(
              '$seconds s',
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
          ],
        ),
        const SizedBox(height: 10),
        LinearProgressIndicator(
          value: ((deadline - now) / 60000).clamp(0.0, 1.0),
        ),
        const SizedBox(height: 24),
        if (q == null)
          title(t('Prepárate…', 'Get ready…'))
        else ...[
          title(q['statement']),
          for (final o in q['options'])
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed:
                      busy || m['selectedOption'] != null || now >= deadline
                      ? null
                      : () => setState(() => choice = o['id']),
                  style: OutlinedButton.styleFrom(
                    alignment: Alignment.centerLeft,
                    padding: const EdgeInsets.all(18),
                    side: BorderSide(
                      color: (m['selectedOption'] ?? choice) == o['id']
                          ? const Color(0xFFAB82EE)
                          : WfColors.of(context).line,
                      width: (m['selectedOption'] ?? choice) == o['id'] ? 2 : 1,
                    ),
                  ),
                  child: Text(
                    '${o['id']}. ${o['text']}',
                    style: TextStyle(
                      color: WfColors.of(context).ink,
                      height: 1.5,
                    ),
                  ),
                ),
              ),
            ),
          button(
            m['selectedOption'] != null
                ? t(
                    'Respuesta enviada · Esperando',
                    'Answer submitted · Waiting',
                  )
                : t('Confirmar respuesta', 'Confirm answer'),
            choice.isEmpty || m['selectedOption'] != null || now >= deadline
                ? null
                : () => act('/matches/${m['id']}/answer', {
                    'round': m['round'],
                    'questionId': q['id'],
                    'option': choice,
                  }),
          ),
        ],
        button(t('Abandonar duelo', 'Forfeit match'), () async {
          if (await confirmLeave()) act('/matches/${m['id']}/leave');
        }, secondary: true),
      ],
      if (phase == 'finished') ...[
        Icon(m['winner'] == null ? ApruebaSymbols.draw : m['winner'] == me ? ApruebaSymbols.victory : ApruebaSymbols.target, size: 46),
        title(
          m['winner'] == null
              ? t('Partida cerrada', 'Match ended')
              : m['winner'] == me
              ? t('¡Victoria!', 'Victory!')
              : t('Sigue mejorando', 'Keep improving'),
        ),
        paragraph(reason(m['reason'])),
        if ((m['review'] as List).isNotEmpty) ...[
          Text(
            '${m['scores'][me]} — ${m['scores'][1 - me]}',
            style: const TextStyle(fontSize: 42, fontWeight: FontWeight.w800),
          ),
          paragraph(
            '${t('Balance neto', 'Net change')}: ${m['net'][me] > 0 ? '+' : ''}${m['net'][me]} ◉ · ${t('Rango', 'Rating')}: ${m['deltas'][me] > 0 ? '+' : ''}${m['deltas'][me]}',
          ),
          ExpansionTile(
            tilePadding: EdgeInsets.zero,
            title: Text(t('Revisar respuestas', 'Review answers')),
            children: [
              for (final item in m['review'])
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item['statement'],
                        style: const TextStyle(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 10),
                      paragraph(
                        '${t('Tu respuesta', 'Your answer')}: ${_option(item, item['selectedOption'])}',
                      ),
                      paragraph(
                        '${t('Respuesta correcta', 'Correct answer')}: ${_option(item, item['correctAnswer'])}',
                      ),
                      for (final step in item['explanation']['steps'] ?? [])
                        paragraph(step),
                    ],
                  ),
                ),
            ],
          ),
        ],
        button(
          t('Volver a Arena', 'Back to Arena'),
          () => setState(() {
            hiddenMatch = m['id'];
            view = null;
          }),
        ),
      ],
    ]);
  }

  String _option(dynamic item, dynamic id) {
    for (final o in item['options']) {
      if (o['id'] == id) return o['text'];
    }
    return t('Sin respuesta', 'No answer');
  }
}
