import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/l10n/l10n.dart';
import 'core/network/api_client.dart';
import 'core/notifications/reminder_service.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/theme_controller.dart';
import 'features/auth/auth_providers.dart';

void main() {
  // Si la sesión vence en cualquier pantalla, volvemos al login.
  ApiClient.onUnauthorized = () => appRouter.go('/login');

  runApp(ProviderScope(retry: (retryCount, error) => null, child: const ApruebaApp()));
}

class ApruebaApp extends ConsumerWidget {
  const ApruebaApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mode = ref.watch(themeModeProvider);
    final locale = ref.watch(localeProvider);

    // Cuando carga el perfil, se aplica el idioma guardado en la base de datos.
    ref.listen(profileProvider, (prev, next) {
      final p = next.value;
      if (p == null) return;
      if (p.locale != ref.read(localeProvider).languageCode) {
        ref.read(localeProvider.notifier).setCode(p.locale);
      }
      // El modo oscuro también se recuerda entre sesiones.
      final wanted = p.theme == 'dark' ? ThemeMode.dark : ThemeMode.light;
      if (wanted != ref.read(themeModeProvider)) {
        ref.read(themeModeProvider.notifier).set(wanted);
      }
      // Recordatorio diario del celular (Android).
      ReminderService.sync(
        enabled: p.dailyReminder,
        time: p.reminderTime,
        locale: p.locale,
      );
    });

    return MaterialApp.router(
      title: 'Aprueba',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: mode,
      locale: locale,
      supportedLocales: const [Locale('es'), Locale('en')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      routerConfig: appRouter,
      // En pantallas anchas (Chrome) limita el ancho para que se vea como móvil.
      builder: (context, child) {
        return ColoredBox(
          color: Theme.of(context).scaffoldBackgroundColor,
          child: Align(
            alignment: Alignment.topCenter,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: child,
            ),
          ),
        );
      },
    );
  }
}
