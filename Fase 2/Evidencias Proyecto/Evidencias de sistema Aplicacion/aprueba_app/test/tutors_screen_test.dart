import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
import 'package:aprueba_app/data/social_models.dart';
import 'package:aprueba_app/data/practice_models.dart';
import 'package:aprueba_app/features/tutors/tutors_screen.dart';
import 'package:aprueba_app/features/tutors/tutors_providers.dart';
import 'package:aprueba_app/features/practice/practice_providers.dart';

void main() {
  setUpAll(() => GoogleFonts.config.allowRuntimeFetching = false);
  for (final mode in [Brightness.light, Brightness.dark]) {
    testWidgets('buscar, filtrar y abrir perfil a 360px en $mode', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(360, 900);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final router = GoRouter(
        routes: [
          GoRoute(path: '/', builder: (_, _) => const TutorsScreen()),
          GoRoute(
            path: '/tutors/profile',
            builder: (_, state) =>
                Scaffold(body: Text('Perfil: ${(state.extra as Tutor).name}')),
          ),
        ],
      );
      addTearDown(router.dispose);
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            tutorsProvider.overrideWith(
              (ref) async => [
                Tutor.fromJson({
                  'id': 'demo-m1',
                  'name': 'Tutor de demostración 1',
                  'subjectTestId': 'm1',
                  'subjectLabel': 'Matemática M1',
                  'specialty': 'Álgebra',
                }),
                Tutor.fromJson({
                  'id': 'demo-hist',
                  'name': 'Tutor de demostración 2',
                  'subjectTestId': 'hist',
                  'subjectLabel': 'Historia',
                  'specialty': 'Ciudadanía',
                }),
              ],
            ),
            testsProvider.overrideWith(
              (ref) async => [
                PracticeTest.fromJson({'id': 'm1', 'label': 'M1'}),
                PracticeTest.fromJson({'id': 'hist', 'label': 'Historia'}),
              ],
            ),
          ],
          child: MaterialApp.router(
            locale: const Locale('es'),
            supportedLocales: const [Locale('es')],
            localizationsDelegates: GlobalMaterialLocalizations.delegates,
            theme: ThemeData(brightness: mode),
            routerConfig: router,
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.textContaining('TUTORES SIMULADOS'), findsOneWidget);
      expect(find.text('Tutor de demostración 1'), findsOneWidget);
      await tester.tap(find.text('Historia').first);
      await tester.pumpAndSettle();
      expect(find.text('Tutor de demostración 1'), findsNothing);
      expect(find.text('Tutor de demostración 2'), findsOneWidget);
      await tester.tap(find.text('Todos'));
      await tester.enterText(find.byType(TextField), 'Álgebra');
      await tester.pumpAndSettle();
      expect(find.text('Tutor de demostración 1'), findsOneWidget);
      expect(find.text('Tutor de demostración 2'), findsNothing);
      await tester.enterText(find.byType(TextField), 'sin coincidencias');
      await tester.pumpAndSettle();
      expect(
        find.text('No hay tutores que coincidan con tu búsqueda.'),
        findsOneWidget,
      );
      await tester.enterText(find.byType(TextField), 'Álgebra');
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Ver perfil ›'));
      await tester.tap(find.text('Ver perfil ›'));
      await tester.pumpAndSettle();
      expect(find.text('Perfil: Tutor de demostración 1'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  }
}
