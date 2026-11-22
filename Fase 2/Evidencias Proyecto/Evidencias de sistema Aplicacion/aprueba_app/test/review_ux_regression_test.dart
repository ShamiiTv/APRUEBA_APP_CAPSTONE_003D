import 'package:aprueba_app/features/settings/settings_screen.dart';
import 'package:aprueba_app/features/auth/auth_providers.dart';
import 'package:aprueba_app/features/auth/auth_repository.dart';
import 'package:aprueba_app/features/practice/practice_providers.dart';
import 'package:aprueba_app/data/user_profile.dart';

import 'dart:io';

import 'package:aprueba_app/features/practice/quota_unlock_screen.dart';

import 'dart:ui' as ui;

import 'package:flutter/rendering.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:aprueba_app/core/theme/app_theme.dart';
import 'package:aprueba_app/core/widgets/app_menu.dart';
import 'package:aprueba_app/features/study/study_plan_screen.dart';
import 'package:aprueba_app/features/activity/activity_screen.dart';
import 'package:aprueba_app/features/groups/groups_screen.dart';
import 'package:aprueba_app/features/groups/group_detail_screen.dart';
import 'package:aprueba_app/features/groups/groups_providers.dart';
import 'package:aprueba_app/features/groups/groups_repository.dart';
import 'package:aprueba_app/features/community/community_repository.dart';
import 'package:aprueba_app/data/social_models.dart';

import 'platform_parity_test.dart' show PlanFixture, ActivityFixture;

final group = StudyGroup.fromJson({
  'id': 'isolated',
  'name': 'Temporary group',
  'subjectTestId': 'm1',
  'memberCount': 1,
  'ownerId': 'owner',
});

class GroupsFixture extends GroupsRepository {
  bool left = false;
  int directoryLoads = 0;
  @override
  Future<List<StudyGroup>> fetchGroups() async => left ? [] : [group];
  @override
  Future<List<StudyGroup>> publicGroups() async {
    directoryLoads++;
    return left ? [] : [group];
  }

  @override
  Future<Map<String, dynamic>> details(String id) async => {
    'role': 'owner',
    'memberCount': 1,
    'members': [],
    'visibility': 'public',
  };
  @override
  Future<FeedPage> groupPostsPage(String id, {String? cursor}) async =>
      FeedPage(posts: [], nextCursor: null);
  @override
  Future<void> removeMember(String id, String member) async {
    left = true;
  }
}

Widget shell(GoRouter router, {bool english = false}) => RepaintBoundary(
  key: const ValueKey('review-capture'),
  child: MaterialApp.router(
    routerConfig: router,
    locale: Locale(english ? 'en' : 'es'),
    supportedLocales: const [Locale('es'), Locale('en')],
    localizationsDelegates: GlobalMaterialLocalizations.delegates,
    theme: AppTheme.dark(),
  ),
);
Future<void> capture(WidgetTester tester, String name) async {
  final captureDir = Platform.environment['APRUEBA_REVIEW_CAPTURE_DIR'];
  if (captureDir == null) return;
  await tester.runAsync(() async {
    final boundary = tester.renderObject<RenderRepaintBoundary>(
      find.byKey(const ValueKey('review-capture')),
    );
    final image = await boundary.toImage(pixelRatio: 1);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    await File('$captureDir/$name.png')
        .writeAsBytes(bytes!.buffer.asUint8List());
    image.dispose();
  });
}

class DialogAuth extends AuthRepository {
  int deletions = 0;
  @override
  Future<UserProfile> fetchProfile() async => UserProfile.fromJson({
    'uid': 'fixture',
    'name': 'Fixture',
    'email': 'fixture@example.test',
  });
  @override
  Future<void> deleteAccount(String password) async {
    deletions++;
  }
}

void main() {
  setUpAll(() => GoogleFonts.config.allowRuntimeFetching = false);
  for (final activity in [false, true]) {
    testWidgets(
      'menu from settings retains return path for ${activity ? 'activity' : 'study plan'}',
      (tester) async {
        final router = GoRouter(
          initialLocation: '/settings',
          routes: [
            GoRoute(
              path: '/settings',
              builder: (context, state) => Scaffold(
                body: TextButton(
                  onPressed: () => showApruebaMenu(context),
                  child: const Text('Menu'),
                ),
              ),
            ),
            GoRoute(
              path: '/study-plan',
              builder: (_, _) => const StudyPlanScreen(),
            ),
            GoRoute(
              path: '/activity',
              builder: (_, _) => const ActivityScreen(),
            ),
          ],
        );
        addTearDown(router.dispose);
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              studyPlanRepositoryProvider.overrideWithValue(PlanFixture()),
              activityRepositoryProvider.overrideWithValue(ActivityFixture()),
            ],
            child: shell(router, english: true),
          ),
        );
        await tester.tap(find.text('Menu'));
        await tester.pumpAndSettle();
        await tester.tap(find.text(activity ? 'My activity' : 'Study plan'));
        await tester.pumpAndSettle();
        await capture(
          tester,
          activity ? 'review-activity-dark' : 'review-plan-dark',
        );
        expect(router.canPop(), true);
        expect(find.byType(BackButton), findsOneWidget);
        if (activity) {
          expect(find.textContaining('Welcome to Aprueba'), findsOneWidget);
          expect(find.textContaining('Bienvenida'), findsNothing);
          expect(find.textContaining('T00:00'), findsNothing);
        } else {
          expect(find.text('Reading Comprehension'), findsOneWidget);
          expect(find.text('Mathematics M1'), findsOneWidget);
        }
        await tester.tap(find.byType(BackButton));
        await tester.pumpAndSettle();
        expect(find.text('Menu'), findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );
  }
  testWidgets(
    'leaving only-member group removes stale public listing in dark theme',
    (tester) async {
      final repo = GroupsFixture();
      final router = GoRouter(
        initialLocation: '/groups',
        routes: [
          GoRoute(path: '/groups', builder: (_, _) => const GroupsScreen()),
          GoRoute(
            path: '/detail',
            builder: (_, _) => GroupDetailScreen(group: group),
          ),
        ],
      );
      addTearDown(router.dispose);
      await tester.pumpWidget(
        ProviderScope(
          overrides: [groupsRepositoryProvider.overrideWithValue(repo)],
          child: shell(router, english: true),
        ),
      );
      await tester.pumpAndSettle();
      expect(repo.directoryLoads, 1);
      router.push('/detail');
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.text('Leave group'),
        350,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(find.text('Leave group'));
      await tester.pumpAndSettle();
      await capture(tester, 'review-leave-dark');
      final cancel = find.widgetWithText(TextButton, 'Cancel');
      expect(tester.getSize(cancel).height, greaterThanOrEqualTo(48));
      await tester.tap(find.widgetWithText(FilledButton, 'Leave'));
      await tester.pumpAndSettle();
      expect(repo.left, true);
      expect(repo.directoryLoads, greaterThanOrEqualTo(2));
      expect(find.text('Temporary group'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );
  for (final dark in [false, true]) {
    testWidgets(
      'delete confirmation stays usable with keyboard and cancel ${dark ? 'dark' : 'light'}',
      (tester) async {
        tester.view.physicalSize = const Size(390, 844);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final auth = DialogAuth();
        final router = GoRouter(
          initialLocation: '/settings',
          routes: [
            GoRoute(
              path: '/settings',
              builder: (_, _) => const SettingsScreen(),
            ),
          ],
        );
        addTearDown(router.dispose);
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              authRepositoryProvider.overrideWithValue(auth),
              testsProvider.overrideWith((ref) async => []),
            ],
            child: MaterialApp.router(
              routerConfig: router,
              locale: const Locale('en'),
              supportedLocales: const [Locale('en')],
              localizationsDelegates: GlobalMaterialLocalizations.delegates,
              theme: dark ? AppTheme.dark() : AppTheme.light(),
            ),
          ),
        );
        await tester.pumpAndSettle();
        await tester.scrollUntilVisible(
          find.text('Delete account').hitTestable(),
          350,
          scrollable: find.byType(Scrollable).first,
        );
        await tester.tap(find.text('Delete account'));
        await tester.pumpAndSettle();
        tester.view.viewInsets = const FakeViewPadding(bottom: 300);
        addTearDown(tester.view.resetViewInsets);
        await tester.pumpAndSettle();
        final cancel = find.widgetWithText(OutlinedButton, 'Cancel');
        expect(tester.getSize(cancel).height, greaterThanOrEqualTo(48));
        expect(tester.getSize(cancel).width, greaterThan(200));
        await tester.ensureVisible(cancel);
        await tester.tap(cancel);
        await tester.pumpAndSettle();
        expect(find.byType(AlertDialog), findsNothing);
        expect(auth.deletions, 0);
        expect(tester.takeException(), isNull);
      },
    );
  }

  for (final dark in [false, true]) {
    testWidgets(
      'quota skip dialog fits a narrow screen ${dark ? 'dark' : 'light'}',
      (tester) async {
        tester.view.physicalSize = const Size(390, 844);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final router = GoRouter(
          initialLocation: '/quota',
          routes: [
            GoRoute(
              path: '/quota',
              builder: (_, _) => const QuotaUnlockScreen(step: 'school'),
            ),
            GoRoute(
              path: '/home',
              builder: (_, _) => const Scaffold(body: Text('Home')),
            ),
          ],
        );
        addTearDown(router.dispose);
        await tester.pumpWidget(
          ProviderScope(
            child: MaterialApp.router(
              routerConfig: router,
              locale: const Locale('en'),
              supportedLocales: const [Locale('en')],
              localizationsDelegates: GlobalMaterialLocalizations.delegates,
              theme: dark ? AppTheme.dark() : AppTheme.light(),
            ),
          ),
        );
        await tester.pumpAndSettle();
        await tester.scrollUntilVisible(
          find.widgetWithText(TextButton, 'Later'),
          250,
          scrollable: find.byType(Scrollable).first,
        );
        await tester.tap(find.widgetWithText(TextButton, 'Later'));
        await tester.pumpAndSettle();
        expect(
          tester
              .getSize(
                find.widgetWithText(OutlinedButton, 'Complete my details'),
              )
              .height,
          greaterThanOrEqualTo(48),
        );
        await tester.tap(
          find.widgetWithText(OutlinedButton, 'Complete my details'),
        );
        await tester.pumpAndSettle();
        expect(find.byType(AlertDialog), findsNothing);
        expect(tester.takeException(), isNull);
      },
    );
  }
}
