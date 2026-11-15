import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:aprueba_app/core/theme/theme_controller.dart';
import 'package:aprueba_app/core/theme/wf_colors.dart';
import 'package:aprueba_app/core/widgets/app_menu.dart';

void main() {
  test('un perfil viejo no revierte el tema mientras se guarda', () async {
    final saved = <ThemeMode>[];
    final container = ProviderContainer(
      overrides: [
        themeModeProvider.overrideWith(
          () => ThemeModeNotifier(
            cache: (mode) async {
              saved.add(mode);
            },
          ),
        ),
      ],
    );
    addTearDown(container.dispose);
    final notifier = container.read(themeModeProvider.notifier),
        pending = Completer<void>();
    final saving = notifier.save(ThemeMode.dark, () => pending.future);
    notifier.applySaved(ThemeMode.light);
    expect(container.read(themeModeProvider), ThemeMode.dark);
    pending.complete();
    await saving;
    expect(saved, [ThemeMode.dark]);
  });
  test(
    'fallo de guardado restaura el tema anterior y permite reintentar',
    () async {
      final container = ProviderContainer(
        overrides: [
          themeModeProvider.overrideWith(
            () => ThemeModeNotifier(cache: (_) async {}),
          ),
        ],
      );
      addTearDown(container.dispose);
      final notifier = container.read(themeModeProvider.notifier);
      await expectLater(
        notifier.save(ThemeMode.dark, () async {
          throw StateError('sin conexión');
        }),
        throwsStateError,
      );
      expect(container.read(themeModeProvider), ThemeMode.light);
      await notifier.save(ThemeMode.dark, () async {});
      expect(container.read(themeModeProvider), ThemeMode.dark);
    },
  );
  test('tema recordado se aplica antes de cargar el perfil', () {
    final container = ProviderContainer(
      overrides: [
        themeModeProvider.overrideWith(
          () => ThemeModeNotifier(
            initialMode: ThemeMode.dark,
            cache: (_) async {},
          ),
        ),
      ],
    );
    addTearDown(container.dispose);
    expect(container.read(themeModeProvider), ThemeMode.dark);
  });
  test('etiquetas semánticas mantienen contraste en ambos temas', () {
    for (final c in [WfColors.light, WfColors.dark]) {
      for (final color in [
        c.success,
        c.danger,
        c.brand,
        const Color(0xFFB45309),
      ]) {
        final bg = Color.alphaBlend(color.withValues(alpha: .12), c.bg);
        final fg = WfColors.readableForeground(color, bg);
        final a = fg.computeLuminance(), b = bg.computeLuminance();
        expect(
          a > b ? (a + .05) / (b + .05) : (b + .05) / (a + .05),
          greaterThanOrEqualTo(4.5),
        );
      }
    }
  });
  testWidgets(
    'menú permite llegar a ajustes y tutores sin pasar por preguntas',
    (tester) async {
      final router = GoRouter(
        routes: [
          GoRoute(
            path: '/',
            builder: (context, state) => Scaffold(
              body: TextButton(
                onPressed: () => showApruebaMenu(context),
                child: const Text('Abrir menú'),
              ),
            ),
          ),
          GoRoute(
            path: '/settings',
            builder: (context, state) =>
                const Scaffold(body: Text('Destino ajustes')),
          ),
        ],
      );
      addTearDown(router.dispose);
      await tester.pumpWidget(MaterialApp.router(routerConfig: router));
      await tester.tap(find.text('Abrir menú'));
      await tester.pumpAndSettle();
      expect(find.text('Tutors'), findsOneWidget);
      expect(find.text('Community'), findsOneWidget);
      await tester.ensureVisible(find.text('Settings'));
      await tester.tap(find.text('Settings'));
      await tester.pumpAndSettle();
      expect(find.text('Destino ajustes'), findsOneWidget);
    },
  );
}

