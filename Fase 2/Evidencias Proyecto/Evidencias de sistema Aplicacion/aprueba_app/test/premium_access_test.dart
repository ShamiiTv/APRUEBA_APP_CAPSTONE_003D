import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:aprueba_app/data/user_profile.dart';
import 'package:aprueba_app/data/practice_models.dart';
import 'package:aprueba_app/features/auth/auth_providers.dart';
import 'package:aprueba_app/features/auth/auth_repository.dart';
import 'package:aprueba_app/features/practice/practice_providers.dart';
import 'package:aprueba_app/features/practice/practice_repository.dart';
import 'package:aprueba_app/features/tutors/gap_analysis_screen.dart';
import 'package:aprueba_app/features/tutors/tutor_contact_screen.dart';
import 'package:aprueba_app/features/onboarding/select_format_screen.dart';
import 'package:aprueba_app/data/social_models.dart';

class FixtureAuth extends AuthRepository {
  FixtureAuth(this.load);
  final Future<UserProfile> Function() load;
  @override
  Future<UserProfile> fetchProfile() => load();
}

class FixturePractice extends PracticeRepository {
  PracticePrefs? saved;
  @override
  Future<void> savePrefs(PracticePrefs prefs) async {
    saved = prefs;
  }
}

UserProfile profile({
  String plan = 'all',
  bool allowed = true,
  DateTime? end,
}) => UserProfile.fromJson({
  'uid': 'fixture',
  'plan': plan,
  'quota': {'unlimited': allowed},
  'currentPeriodEnd': (end ?? DateTime.now().add(const Duration(days: 1)))
      .toIso8601String(),
});
Widget localized(Widget child) => MaterialApp(
  locale: const Locale('es'),
  supportedLocales: const [Locale('es')],
  localizationsDelegates: GlobalMaterialLocalizations.delegates,
  home: child,
);
void main() {
  setUpAll(() => GoogleFonts.config.allowRuntimeFetching = false);
  test('permiso requiere all, autorización del servidor y fecha vigente', () {
    expect(profile().hasTutorAccess, true);
    expect(profile(plan: 'free').hasTutorAccess, false);
    expect(profile(plan: 'uni').hasTutorAccess, false);
    expect(profile(allowed: false).hasTutorAccess, false);
    expect(
      profile(end: DateTime.now().subtract(const Duration(seconds: 1)))
          .hasTutorAccess,
      false,
    );
    expect(
      UserProfile.fromJson({
        'plan': 'all',
        'quota': {'unlimited': true},
      }).hasTutorAccess,
      false,
    );
    final seconds =
        DateTime.now().add(const Duration(days: 1)).millisecondsSinceEpoch ~/
        1000;
    expect(
      UserProfile.fromJson({
        'plan': 'all',
        'quota': {'unlimited': true},
        'currentPeriodEnd': {'_seconds': seconds},
      }).hasTutorAccess,
      true,
    );
  });
  for (final plan in ['free', 'uni', 'expired', 'denied']) {
    testWidgets(
      'acceso directo a análisis bloqueado para $plan sin cargar progreso',
      (tester) async {
        var progressReads = 0;
        final p = profile(
          plan: plan == 'free' || plan == 'uni' ? plan : 'all',
          allowed: plan != 'denied',
          end: plan == 'expired'
              ? DateTime.now().subtract(const Duration(days: 1))
              : null,
        );
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              authRepositoryProvider.overrideWithValue(
                FixtureAuth(() async => p),
              ),
              progressProvider.overrideWith((ref) async {
                progressReads++;
                return <String, ProgressItem>{};
              }),
            ],
            child: localized(const GapAnalysisScreen()),
          ),
        );
        await tester.pumpAndSettle();
        expect(find.text('Desbloquea los Tutores'), findsOneWidget);
        expect(find.text('Tu diagnóstico PAES'), findsNothing);
        expect(progressReads, 0);
      },
    );
  }
  testWidgets(
    'perfil pendiente no revela análisis; al cargar all vigente muestra contenido',
    (tester) async {
      final pending = Completer<UserProfile>();
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authRepositoryProvider.overrideWithValue(
              FixtureAuth(() => pending.future),
            ),
            progressProvider.overrideWith(
              (ref) async => <String, ProgressItem>{},
            ),
            testsProvider.overrideWith((ref) async => <PracticeTest>[]),
          ],
          child: localized(const GapAnalysisScreen()),
        ),
      );
      await tester.pump();
      expect(find.text('Tu diagnóstico PAES'), findsNothing);
      pending.complete(profile());
      await tester.pumpAndSettle();
      expect(find.text('Tu diagnóstico PAES'), findsOneWidget);
    },
  );
  testWidgets('contacto directo bloqueado con plan vencido', (tester) async {
    final tutor = Tutor.fromJson({'id': 'demo-m1', 'name': 'Tutor de prueba'});
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(
            FixtureAuth(() async => profile(allowed: false)),
          ),
        ],
        child: localized(TutorContactScreen(tutor: tutor)),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Desbloquea los Tutores'), findsOneWidget);
    expect(find.byType(TextField), findsNothing);
  });
  for (final paid in [false, true]) {
    testWidgets(
      'configuración general conserva aleatorio y explica Facsímil separado, paid=$paid',
      (tester) async {
        final repo = FixturePractice();
        tester.view.physicalSize = const Size(360, 900);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              practiceRepositoryProvider.overrideWithValue(repo),
              authRepositoryProvider.overrideWithValue(
                FixtureAuth(() async => profile()),
              ),
            ],
            child: localized(
              Builder(
                builder: (context) => Scaffold(
                  body: TextButton(
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => SelectFormatScreen(
                          selectedTests: const ['m1'],
                          initialFormat: 'facsim',
                          initialDifficulty: 'd1',
                          paid: paid,
                        ),
                      ),
                    ),
                    child: const Text('Abrir'),
                  ),
                ),
              ),
            ),
          ),
        );
        await tester.tap(find.text('Abrir'));
        await tester.pumpAndSettle();
        expect(find.text('Facsímil'), findsOneWidget);
        expect(find.textContaining('Próximamente'), findsNothing);
        await tester.tap(find.text('Continuar'));
        await tester.pumpAndSettle();
        expect(repo.saved?.format, 'random');
        expect(tester.takeException(), isNull);
      },
    );
  }
}
