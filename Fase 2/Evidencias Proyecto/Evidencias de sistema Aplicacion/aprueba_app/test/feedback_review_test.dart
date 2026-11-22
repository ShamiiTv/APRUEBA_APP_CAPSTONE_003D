import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:aprueba_app/core/theme/app_theme.dart';
import 'package:aprueba_app/core/theme/wf_colors.dart';
import 'package:aprueba_app/core/widgets/app_viewport.dart';
import 'package:aprueba_app/features/auth/login_screen.dart';
import 'package:aprueba_app/features/auth/auth_repository.dart';
import 'package:aprueba_app/features/auth/auth_providers.dart';
import 'package:aprueba_app/features/onboarding/select_format_screen.dart';
import 'package:aprueba_app/features/activity/activity_screen.dart';
import 'package:aprueba_app/features/practice/levels_screen.dart';
import 'package:aprueba_app/features/practice/facsimile_screen.dart';
import 'package:aprueba_app/data/user_profile.dart';

class ReviewAuth extends AuthRepository {
  int reads = 0;
  @override
  Future<UserProfile> fetchProfile() async {
    reads++;
    return UserProfile.fromJson({
      'uid': 'review',
      'name': 'Fixture',
      'email': 'fixture@example.test',
      'plan': 'all',
      'quota': {'unlimited': true},
      'currentPeriodEnd': '2099-01-01T00:00:00Z',
      'onboardingCompleted': true,
      'selectedTests': ['m1', 'm2'],
    });
  }
}

const internalQuestionId =
    'q_250642c19230e51a1f556296352e7120062cffd36e4845a7fa03d531e10e5445';

class ReviewActivity extends ActivityRepository {
  @override
  Future<({Map<String, dynamic> medals, Map<String, dynamic> progress})>
  fetch() async => (
    medals: {
      'history': [
        {
          'amount': 1,
          'tier': 'bronze',
          'reason': 'Respuesta correcta en ítem $internalQuestionId (m1)',
          'createdAt': '2026-11-22T03:35:00Z',
        },
      ],
      'redemptions': [],
    },
    progress: {
      'recent': [
        {
          'testId': 'm1',
          'isCorrect': true,
          'answeredAt': '2026-11-22T03:35:00Z',
        },
      ],
    },
  );
}

class ReviewLevels extends LevelsRepository {
  final tests = <String>[];
  @override
  Future<List<dynamic>> fetch(String test) async {
    tests.add(test);
    return [
      {'id': 'd1', 'available': 0, 'correct': 0, 'unlocked': false},
      {
        'id': 'd2',
        'available': test == 'm1' ? 423 : 256,
        'correct': 1,
        'unlocked': true,
      },
      {'id': 'd3', 'available': 0, 'correct': 0, 'unlocked': false},
    ];
  }
}

class ReviewFacsimile extends FacsimileRepository {
  final bool paid;
  ReviewFacsimile(this.paid);
  int sent = 0;
  bool active = false;
  final calls = <Map<String, dynamic>>[];
  @override
  Future<Map<String, dynamic>> catalog() async => {
    'access': paid,
    'activeId': active ? 'fixture-session' : null,
    'catalog': [
      {
        'id': 'm1',
        'levels': [
          {'id': 'd1', 'available': 0},
          {'id': 'd2', 'available': 5},
          {'id': 'd3', 'available': 0},
        ],
      },
    ],
    'history': [],
  };
  Map<String, dynamic> snapshot() => {
    'id': 'fixture-session',
    'testId': 'm1',
    'difficulty': 'd2',
    'status': sent == 2 ? 'finished' : 'active',
    'canContinue': true,
    'index': sent,
    'total': 2,
    'answered': sent,
    'correct': sent == 2 ? 1 : null,
    'question': sent == 2
        ? null
        : {
            'id': 'q-${sent + 1}',
            'statement': 'Pregunta ${sent + 1}: 2 + 2',
            'options': [
              {'id': 'A', 'text': '3'},
              {'id': 'B', 'text': '4'},
            ],
          },
    'review': sent == 2
        ? [
            {
              'id': 'q-1',
              'statement': 'Pregunta 1: 2 + 2',
              'options': [
                {'id': 'A', 'text': '3'},
                {'id': 'B', 'text': '4'},
              ],
              'selectedOption': 'B',
              'correctAnswer': 'B',
              'isCorrect': true,
              'explanation': 'Dos más dos es cuatro.',
              'keyConcept': 'Suma',
            },
          ]
        : [],
  };
  @override
  Future<Map<String, dynamic>> get(String id) async => snapshot();
  @override
  Future<Map<String, dynamic>> command(
    String path,
    Map<String, dynamic> body,
  ) async {
    calls.add({'path': path, 'body': body});
    if (path.endsWith('/answers')) sent++;
    active = sent < 2;
    return snapshot();
  }
}

Future<void> frame(
  WidgetTester tester,
  Widget home, {
  bool dark = false,
  bool en = false,
  ReviewFacsimile? exam,
}) async {
  tester.view.physicalSize = const Size(360, 1600);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        authRepositoryProvider.overrideWithValue(ReviewAuth()),
        activityRepositoryProvider.overrideWithValue(ReviewActivity()),
        if (exam != null) facsimileRepositoryProvider.overrideWithValue(exam),
      ],
      child: MaterialApp(
        locale: Locale(en ? 'en' : 'es'),
        supportedLocales: const [Locale('es'), Locale('en')],
        localizationsDelegates: GlobalMaterialLocalizations.delegates,
        theme: dark ? AppTheme.dark() : AppTheme.light(),
        home: home,
      ),
    ),
  );
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 50));
}

void main() {
  setUpAll(() => GoogleFonts.config.allowRuntimeFetching = false);
  for (final dark in [false, true]) {
    testWidgets('login and format surfaces follow theme at 360px dark=$dark', (
      tester,
    ) async {
      await frame(tester, const LoginScreen(), dark: dark);
      final c = dark ? WfColors.dark : WfColors.light;
      expect(
        tester.widget<Text>(find.text('Ingresa a tu cuenta')).style?.color,
        c.ink,
      );
      expect(tester.takeException(), isNull);
      await frame(
        tester,
        const SelectFormatScreen(
          selectedTests: ['m1'],
          initialFormat: 'random',
          initialDifficulty: 'd2',
          paid: false,
        ),
        dark: dark,
      );
      expect(find.text('Empiezas en Básico'), findsNothing);
      expect(find.textContaining('Próximamente'), findsNothing);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    });
    testWidgets(
      'activity uses readable rewards and does not expose internal question IDs dark=$dark',
      (tester) async {
        await frame(tester, const ActivityScreen(), dark: dark);
        await tester.scrollUntilVisible(
          find.textContaining('Respuesta correcta de práctica'),
          200,
        );
        expect(find.textContaining(internalQuestionId), findsNothing);
        expect(
          find.textContaining('Respuesta correcta de práctica · Matemática M1'),
          findsOneWidget,
        );
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox());
      },
    );
  }
  testWidgets(
    'level selector changes test and opens requested practice without editing profile',
    (tester) async {
      final levels = ReviewLevels(), auth = ReviewAuth();
      final router = GoRouter(
        initialLocation: '/levels',
        routes: [
          GoRoute(path: '/levels', builder: (c, s) => const LevelsScreen()),
          GoRoute(
            path: '/practice',
            builder: (c, s) => Scaffold(
              body: Text(
                '${s.uri.queryParameters['testId']}:${s.uri.queryParameters['difficulty']}',
              ),
            ),
          ),
        ],
      );
      addTearDown(router.dispose);
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            levelsRepositoryProvider.overrideWithValue(levels),
            authRepositoryProvider.overrideWithValue(auth),
          ],
          child: MaterialApp.router(
            theme: AppTheme.dark(),
            locale: const Locale('es'),
            supportedLocales: const [Locale('es')],
            localizationsDelegates: GlobalMaterialLocalizations.delegates,
            routerConfig: router,
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byType(DropdownButtonFormField<String>));
      await tester.pumpAndSettle();
      await tester.tap(find.text('M2').last);
      await tester.pumpAndSettle();
      expect(levels.tests.last, 'm2');
      await tester.tap(find.text('Intermedia'));
      await tester.pumpAndSettle();
      expect(find.text('m2:d2'), findsOneWidget);
      expect(auth.reads, 0);
      await tester.pumpWidget(const SizedBox());
    },
  );
  for (final en in [false, true]) {
    testWidgets(
      'free mock exams show monthly gate in selected language en=$en',
      (tester) async {
        await frame(
          tester,
          const FacsimileScreen(),
          en: en,
          dark: true,
          exam: ReviewFacsimile(false),
        );
        expect(
          find.text(
            en ? 'Included in Full access' : 'Incluido en Acceso completo',
          ),
          findsOneWidget,
        );
        expect(
          find.text(en ? 'Start mock exam' : 'Comenzar facsímil'),
          findsNothing,
        );
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox());
      },
    );
  }
  testWidgets('mock exam sends chosen count then ordered answers and result', (
    tester,
  ) async {
    final repo = ReviewFacsimile(true);
    await frame(tester, const FacsimileScreen(), exam: repo);
    await tester.enterText(find.byType(TextField), '2');
    await tester.pump();
    await tester.ensureVisible(find.text('Comenzar facsímil'));
    await tester.tap(find.text('Comenzar facsímil'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(repo.calls.first['body']['count'], 2);
    expect(find.textContaining('Pregunta 1: 2 + 2'), findsOneWidget);
    await tester.ensureVisible(find.text('B. 4'));
    await tester.tap(find.text('B. 4'));
    await tester.pump();
    await tester.ensureVisible(find.text('Enviar y continuar'));
    await tester.tap(find.text('Enviar y continuar'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 20));
    expect(repo.calls[1]['body']['index'], 0);
    expect(repo.calls[1]['body']['option'], 'B');
    expect(find.textContaining('Pregunta 2: 2 + 2'), findsOneWidget);
    await tester.ensureVisible(find.text('A. 3'));
    await tester.tap(find.text('A. 3'));
    await tester.pump();
    await tester.ensureVisible(find.text('Enviar y ver resultado'));
    await tester.tap(find.text('Enviar y ver resultado'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 20));
    expect(repo.calls[2]['body']['index'], 1);
    expect(find.text('¡Ensayo completado!'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
  });
  for (final keyboard in [false, true]) {
    testWidgets(
      'viewport keeps controls above navigation or keyboard: keyboard=$keyboard',
      (tester) async {
        tester.view.physicalSize = const Size(360, 800);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        await tester.pumpWidget(
          MaterialApp(
            theme: AppTheme.light(),
            builder: (context, child) => MediaQuery(
              data: MediaQuery.of(context).copyWith(
                padding: EdgeInsets.only(bottom: keyboard ? 0 : 24),
                viewPadding: const EdgeInsets.only(bottom: 24),
                viewInsets: EdgeInsets.only(bottom: keyboard ? 220 : 0),
              ),
              child: AppViewport(child: child!),
            ),
            home: Scaffold(
              body: Align(
                alignment: Alignment.bottomCenter,
                child: FilledButton(
                  key: const Key('last-control'),
                  onPressed: () {},
                  child: const Text('Continuar'),
                ),
              ),
            ),
          ),
        );
        await tester.pump();
        expect(
          tester.getRect(find.byKey(const Key('last-control'))).bottom,
          lessThanOrEqualTo(keyboard ? 580 : 776),
        );
        final style = tester
            .widget<AnnotatedRegion<SystemUiOverlayStyle>>(
              find.byType(AnnotatedRegion<SystemUiOverlayStyle>).first,
            )
            .value;
        expect(style.statusBarIconBrightness, Brightness.dark);
        await tester.pumpWidget(const SizedBox());
      },
    );
  }
}
