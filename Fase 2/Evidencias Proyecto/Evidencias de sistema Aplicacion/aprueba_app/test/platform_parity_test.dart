import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:aprueba_app/features/study/study_plan_screen.dart';
import 'package:aprueba_app/features/activity/activity_screen.dart';
import 'package:aprueba_app/features/community/community_repository.dart';
import 'package:aprueba_app/features/community/post_comments_sheet.dart';
import 'package:aprueba_app/data/social_models.dart';
import 'package:aprueba_app/data/practice_models.dart';

Widget app(Widget child, {Brightness brightness = Brightness.light}) =>
    MaterialApp(
      locale: const Locale('es'),
      supportedLocales: const [Locale('es')],
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
      theme: ThemeData(brightness: brightness),
      home: child,
    );

class PlanFixture extends StudyPlanRepository {
  int goal = 10;
  List<String> ids = ['m1'];
  int saves = 0;
  bool fail = false;
  @override
  Future<Map<String, dynamic>> fetch() async {
    if (fail) throw StateError('isolated');
    return {
      'settings': {'dailyGoal': goal, 'testIds': ids},
      'date': '2026-11-16',
      'completedToday': 1,
      'remainingGoal': goal - 1,
      'quotaRemaining': 9,
      'scheduled': 3,
      'tasks': [
        {
          'testId': 'm1',
          'label': 'Matemática M1',
          'reason': 'reinforce',
          'answered': 10,
          'correct': 2,
          'accuracy': 20,
          'scheduled': 3,
        },
      ],
    };
  }

  @override
  Future<void> save(int value, List<String> tests) async {
    goal = value;
    ids = tests;
    saves++;
  }
}

class ActivityFixture extends ActivityRepository {
  @override
  Future<({Map<String, dynamic> medals, Map<String, dynamic> progress})>
  fetch() async => (
    medals: {
      'history': [
        {
          'amount': 1,
          'tier': 'bronze',
          'reason': 'Bienvenida a Aprueba',
          'createdAt': '2026-11-16',
        },
      ],
      'redemptions': [
        {
          'name': 'Beneficio de prueba',
          'id': 'reference-test',
          'status': 'pending',
        },
      ],
    },
    progress: {
      'recent': [
        {'testId': 'm1', 'isCorrect': true, 'answeredAt': '2026-11-16'},
      ],
    },
  );
}

class CommentsFixture extends CommunityRepository {
  final requested = <String?>[];
  PostComment comment(String id) => PostComment.fromJson({
    'id': id,
    'author': {'name': 'Cuenta de prueba'},
    'text': 'Comentario $id',
    'createdAt': '2026-11-16T12:00:00Z',
  });
  @override
  Future<CommentsPage> fetchCommentsPage(
    String postId, {
    String? cursor,
  }) async {
    requested.add(cursor);
    return CommentsPage(
      comments: [
        for (
          var i = cursor == null ? 0 : 20;
          i < (cursor == null ? 20 : 23);
          i++
        )
          comment('c$i'),
      ],
      nextCursor: cursor == null ? 'page-two' : null,
    );
  }

  @override
  Future<({PostComment comment, int count})> addCommentWithCount(
    String id,
    String text,
  ) async => (comment: comment('new'), count: 24);
}

void main() {
  setUpAll(() => GoogleFonts.config.allowRuntimeFetching = false);
  for (final brightness in [Brightness.light, Brightness.dark]) {
    testWidgets(
      'plan compartido guarda pruebas y meta sin desbordar en $brightness',
      (tester) async {
        tester.view.physicalSize = const Size(390, 1200);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final repository = PlanFixture();
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              studyPlanRepositoryProvider.overrideWithValue(repository),
            ],
            child: app(const StudyPlanScreen(), brightness: brightness),
          ),
        );
        await tester.pumpAndSettle();
        await tester.tap(find.text('M2'));
        await tester.pumpAndSettle();
        await tester.ensureVisible(find.text('Guardar plan'));
        await tester.tap(find.text('Guardar plan'));
        await tester.pumpAndSettle();
        expect(repository.ids, containsAll(['m1', 'm2']));
        expect(repository.saves, 1);
        expect(repository.goal, 10);
        expect(tester.takeException(), isNull);
      },
    );
  }
  testWidgets('plan permite recuperar un error de carga', (tester) async {
    final repository = PlanFixture()..fail = true;
    await tester.pumpWidget(
      ProviderScope(
        overrides: [studyPlanRepositoryProvider.overrideWithValue(repository)],
        child: app(const StudyPlanScreen()),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Reintentar'), findsOneWidget);
    repository.fail = false;
    await tester.tap(find.text('Reintentar'));
    await tester.pumpAndSettle();
    expect(find.text('Configura tu meta'), findsOneWidget);
  });
  testWidgets(
    'actividad muestra respuestas, movimientos y referencia pendiente',
    (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            activityRepositoryProvider.overrideWithValue(ActivityFixture()),
          ],
          child: app(const ActivityScreen()),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Últimas respuestas'), findsOneWidget);
      expect(find.text('Correcta'), findsOneWidget);
      expect(find.textContaining('Bienvenida a Aprueba'), findsOneWidget);
      expect(find.textContaining('reference-test'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets('comentarios usan cursor y preservan el total del servidor', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 1000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final repository = CommentsFixture();
    int? count;
    await tester.pumpWidget(
      app(
        Scaffold(
          body: PostCommentsSheet(
            postId: 'fixture',
            repository: repository,
            onCountChanged: (value) => count = value,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(count, isNull);
    await tester.scrollUntilVisible(
      find.text('Ver comentarios anteriores'),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.drag(find.byType(ListView).first, const Offset(0, -600));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Ver comentarios anteriores'));
    await tester.pumpAndSettle();
    expect(repository.requested, [null, 'page-two']);
    await tester.enterText(find.byType(TextField), 'Nuevo comentario');
    await tester.tap(find.widgetWithText(FilledButton, 'Comentar'));
    await tester.pumpAndSettle();
    expect(count, 24);
    expect(tester.takeException(), isNull);
  });
  test('exactitud y cobertura del banco son métricas diferentes', () {
    final p = ProgressItem.fromJson({
      'answered': 10,
      'correct': 2,
      'accuracy': 20,
      'coverage': 90,
    });
    expect(p.accuracy, 20);
    expect(p.percent, 90);
  });
}
