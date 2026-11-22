import 'dart:async';

import 'package:aprueba_app/features/arena/arena_screen.dart';
import 'package:aprueba_app/core/theme/app_theme.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';

class ArenaFixture extends ArenaRepository {
  Map<String, dynamic> value;
  final calls = <Map<String, dynamic>>[];
  ArenaFixture(this.value);
  @override
  Future<Map<String, dynamic>> state() async => value;
  @override
  Future<String> updates(String cursor, CancelToken cancel) =>
      Completer<String>().future;
  @override
  Future<void> command(
    String path, [
    Map<String, dynamic> body = const {},
  ]) async {
    calls.add({'path': path, 'body': body});
    if (path.endsWith('/answer')) {
      value = {
        ...value,
        'match': {...value['match'], 'selectedOption': body['option']},
      };
    }
  }
}

Map<String, dynamic> fixture({int balance = 2, Map<String, dynamic>? match}) =>
    {
      'serverNow': DateTime.now().millisecondsSinceEpoch,
      'balance': balance,
      'dailyUsed': 0,
      'seat': null,
      'match': match,
      'tests': [
        {'id': 'm1', 'available': true, 'rating': 1000, 'games': 0},
        {'id': 'm2', 'available': true, 'rating': 1000, 'games': 0},
      ],
      'history': [],
    };
Future<void> open(
  WidgetTester tester,
  ArenaFixture repo, {
  bool dark = false,
  bool en = false,
}) async {
  tester.view.physicalSize = const Size(360, 1800);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [arenaRepositoryProvider.overrideWithValue(repo)],
      child: MaterialApp(
        locale: Locale(en ? 'en' : 'es'),
        supportedLocales: const [Locale('es'), Locale('en')],
        localizationsDelegates: GlobalMaterialLocalizations.delegates,
        theme: dark ? AppTheme.dark() : AppTheme.light(),
        home: const ArenaScreen(),
      ),
    ),
  );
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 10));
}

void main() {
  setUpAll(() => GoogleFonts.config.allowRuntimeFetching = false);
  for (final en in [false, true]) {
    for (final dark in [false, true]) {
      testWidgets(
        'Arena lobby at 360px, locale=$en dark=$dark, no affordable entry',
        (tester) async {
          final repo = ArenaFixture(fixture(balance: 0));
          await open(tester, repo, en: en, dark: dark);
          final text = en
              ? 'Find opponent · Entry ◉ 1'
              : 'Buscar rival · Entrada ◉ 1';
          await tester.scrollUntilVisible(find.text(text), 250);
          final button = tester.widget<FilledButton>(
            find.ancestor(
              of: find.text(text),
              matching: find.byType(FilledButton),
            ),
          );
          expect(button.onPressed, isNull);
          expect(tester.takeException(), isNull);
          await tester.pumpWidget(const SizedBox());
        },
      );
    }
  }
  testWidgets(
    'one answer sent with question and round, then locked by server snapshot',
    (tester) async {
      final ms = DateTime.now().millisecondsSinceEpoch;
      final repo = ArenaFixture(
        fixture(
          match: {
            'id': 'fixture',
            'testId': 'm1',
            'phase': 'live',
            'me': 0,
            'players': [
              {
                'alias': 'Aprueba #A',
                'rating': 1000,
                'games': 0,
                'answered': false,
                'connected': true,
              },
              {
                'alias': 'Aprueba #B',
                'rating': 1000,
                'games': 0,
                'answered': false,
                'connected': true,
              },
            ],
            'round': 0,
            'roundStartsAt': ms - 1000,
            'deadline': ms + 59000,
            'selectedOption': null,
            'question': {
              'id': 'q-fixture',
              'statement': '¿Cuánto es 2 + 2?',
              'options': [
                {'id': 'A', 'text': '4'},
                {'id': 'B', 'text': '5'},
              ],
            },
          },
        ),
      );
      await open(tester, repo);
      await tester.scrollUntilVisible(find.text('A. 4'), 250);
      await tester.tap(find.text('A. 4'));
      await tester.pump();
      await tester.scrollUntilVisible(find.text('Confirmar respuesta'), 200);
      await tester.tap(find.text('Confirmar respuesta'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 20));
      expect(repo.calls.single, {
        'path': '/matches/fixture/answer',
        'body': {'round': 0, 'questionId': 'q-fixture', 'option': 'A'},
      });
      expect(find.text('Respuesta enviada · Esperando'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    },
  );
}
