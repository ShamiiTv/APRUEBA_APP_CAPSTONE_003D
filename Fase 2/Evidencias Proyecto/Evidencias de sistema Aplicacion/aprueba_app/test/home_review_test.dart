import 'package:aprueba_app/features/auth/auth_repository.dart';
import 'package:aprueba_app/data/notification_models.dart';

import 'package:aprueba_app/features/home/home_screen.dart';
import 'package:aprueba_app/features/auth/auth_providers.dart';
import 'package:aprueba_app/features/practice/practice_providers.dart';
import 'package:aprueba_app/features/notifications/notifications_providers.dart';
import 'package:aprueba_app/data/user_profile.dart';
import 'package:aprueba_app/data/practice_models.dart';
import 'package:aprueba_app/core/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';

class HomeAuthFixture extends AuthRepository {
  final Map<String, dynamic> data;
  HomeAuthFixture(this.data);
  @override
  Future<UserProfile> fetchProfile() async => UserProfile.fromJson(data);
}

void main() {
  setUpAll(() => GoogleFonts.config.allowRuntimeFetching = false);
  for (final dark in [false, true]) {
    testWidgets(
      'Home shows server streak and readable zero balances at 360px: dark=$dark',
      (tester) async {
        tester.view.physicalSize = const Size(360, 1400);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              authRepositoryProvider.overrideWithValue(
                HomeAuthFixture({
                  'uid': 'fixture',
                  'name': 'Alumno Fixture',
                  'plan': 'all',
                  'currentPeriodEnd': '2099-01-01T00:00:00Z',
                  'streak': 99,
                  'medals': {'bronze': 2},
                  'quota': {'unlimited': true, 'max': 10, 'used': 0},
                  'selectedTests': ['m1'],
                }),
              ),
              testsProvider.overrideWith(
                (ref) async => [
                  const PracticeTest(
                    id: 'm1',
                    label: 'Matemática M1',
                    color: Colors.purple,
                    hasQuestions: true,
                  ),
                ],
              ),
              progressSnapshotProvider.overrideWith(
                (ref) async => {
                  'streak': 0,
                  'subjects': [
                    {
                      'testId': 'm1',
                      'answered': 5,
                      'correct': 3,
                      'coverage': 20,
                      'accuracy': 60,
                    },
                  ],
                },
              ),
              notificationsProvider.overrideWith(
                (ref) async => (items: const <AppNotification>[], unread: 0),
              ),
            ],
            child: MaterialApp(
              locale: const Locale('es'),
              supportedLocales: const [Locale('es')],
              localizationsDelegates: GlobalMaterialLocalizations.delegates,
              theme: dark ? AppTheme.dark() : AppTheme.light(),
              home: const HomeScreen(),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(find.text('0 días'), findsOneWidget);
        expect(find.textContaining('99'), findsNothing);
        expect(find.text('5'), findsOneWidget);
        expect(find.text('60%'), findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );
  }
  testWidgets('Home does not fabricate zero progress when the snapshot fails', (
    tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(
            HomeAuthFixture({
              'uid': 'fixture',
              'name': 'Fixture',
              'plan': 'free',
              'streak': 99,
              'quota': {'max': 10, 'used': 0},
            }),
          ),
          testsProvider.overrideWith((ref) async => []),
          progressSnapshotProvider.overrideWith(
            (ref) async => throw StateError('Isolated failure'),
          ),
          notificationsProvider.overrideWith(
            (ref) async => (items: const <AppNotification>[], unread: 0),
          ),
        ],
        child: MaterialApp(
          locale: const Locale('es'),
          supportedLocales: const [Locale('es')],
          localizationsDelegates: GlobalMaterialLocalizations.delegates,
          home: const HomeScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.drag(find.byType(ListView), const Offset(0, -450));
    await tester.pumpAndSettle();
    expect(
      find.text(
        'No se pudo cargar tu avance. Desliza hacia abajo para reintentar.',
      ),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
  });
  testWidgets(
    'Home uses current server quota instead of a stale unlimited profile',
    (tester) async {
      tester.view.physicalSize = const Size(390, 1600);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authRepositoryProvider.overrideWithValue(
              HomeAuthFixture({
                'uid': 'fixture',
                'name': 'Fixture',
                'plan': 'all',
                'currentPeriodEnd': '2099-01-01T00:00:00Z',
                'quota': {'unlimited': true, 'max': 10, 'used': 0},
              }),
            ),
            testsProvider.overrideWith(
              (ref) async => [
                const PracticeTest(
                  id: 'm1',
                  label: 'Matemática M1',
                  color: Colors.purple,
                  hasQuestions: true,
                ),
              ],
            ),
            progressSnapshotProvider.overrideWith(
              (ref) async => {
                'streak': 0,
                'quota': {
                  'max': 10,
                  'used': 10,
                  'unlimited': false,
                  'unlimitedTestId': null,
                },
                'subjects': [
                  {'testId': 'm1', 'answered': 5, 'correct': 3, 'coverage': 20},
                ],
              },
            ),
            notificationsProvider.overrideWith(
              (ref) async => (items: const <AppNotification>[], unread: 0),
            ),
          ],
          child: MaterialApp(
            locale: const Locale('es'),
            supportedLocales: const [Locale('es')],
            localizationsDelegates: GlobalMaterialLocalizations.delegates,
            home: const HomeScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Plan gratuito · 10 preguntas al día'), findsOneWidget);
      expect(
        tester
            .widget<FilledButton>(
              find.widgetWithText(FilledButton, 'Continuar práctica'),
            )
            .onPressed,
        isNull,
      );
      expect(tester.takeException(), isNull);
    },
  );
}
