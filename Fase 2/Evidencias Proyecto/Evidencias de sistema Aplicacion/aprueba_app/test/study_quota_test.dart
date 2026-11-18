import 'package:aprueba_app/features/study/study_plan_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'platform_parity_test.dart' show app;

class QuotaFixture extends StudyPlanRepository {
  final bool paid;
  final int target;
  QuotaFixture({this.paid = false, this.target = 10});
  @override
  Future<Map<String, dynamic>> fetch() async => {
    'settings': {
      'dailyGoal': target,
      'testIds': ['m1', 'm2'],
    },
    'saved': true,
    'date': '2026-11-18',
    'limits': {
      'maxGoal': paid ? 100 : 10,
      'freeDailyMax': 10,
      'paidGoalMax': 100,
      'unlimitedAll': false,
      'unlimitedTestId': paid ? 'm1' : null,
    },
    'completedToday': 10,
    'remainingGoal': target - 10,
    'quotaRemaining': paid ? 0 : 1,
    'scheduled': target - 10,
    'tasks': [
      {
        'testId': 'm1',
        'label': 'Matemática M1',
        'reason': 'continue',
        'answered': 10,
        'accuracy': 80,
        'completed': 10,
        'available': 100,
        'remaining': 90,
        'scheduled': target - 10,
      },
    ],
  };
}

void main() {
  for (final paid in [false, true]) {
    testWidgets(
      'completed target still permits entitled practice: paid=$paid',
      (tester) async {
        tester.view.physicalSize = const Size(390, 1600);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              studyPlanRepositoryProvider.overrideWithValue(
                QuotaFixture(paid: paid),
              ),
            ],
            child: app(const StudyPlanScreen()),
          ),
        );
        await tester.pumpAndSettle();
        expect(tester.widget<Slider>(find.byType(Slider)).max, paid ? 100 : 10);
        final action = find.widgetWithText(
          FilledButton,
          'Seguir practicando →',
        );
        await tester.ensureVisible(action);
        await tester.pumpAndSettle();
        expect(tester.widget<FilledButton>(action).onPressed, isNotNull);
        expect(find.text('Cuota agotada por hoy.'), findsNothing);
        expect(tester.takeException(), isNull);
      },
    );
  }
  testWidgets('removing the unlimited subject clamps the draft to free quota', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 1600);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          studyPlanRepositoryProvider.overrideWithValue(
            QuotaFixture(paid: true, target: 50),
          ),
        ],
        child: app(const StudyPlanScreen()),
      ),
    );
    await tester.pumpAndSettle();
    final chip = find.widgetWithText(FilterChip, 'M1');
    await tester.ensureVisible(chip);
    await tester.pumpAndSettle();
    await tester.tap(chip);
    await tester.pumpAndSettle();
    expect(tester.widget<Slider>(find.byType(Slider)).max, 10);
    expect(tester.widget<Slider>(find.byType(Slider)).value, 10);
    expect(tester.takeException(), isNull);
  });
}
