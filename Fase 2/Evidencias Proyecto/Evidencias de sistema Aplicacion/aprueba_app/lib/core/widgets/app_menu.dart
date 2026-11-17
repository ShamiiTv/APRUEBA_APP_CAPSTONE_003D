import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../l10n/l10n.dart';
import '../theme/wf_colors.dart';

Future<void> showApruebaMenu(BuildContext context) async {
  final c = WfColors.of(context);
  final entries = [
    (
      Icons.calendar_today_outlined,
      tr(context, 'Plan de estudio', 'Study plan'),
      tr(context, 'Meta y recomendaciones', 'Goal and recommendations'),
      '/study-plan',
    ),
    (
      Icons.history,
      tr(context, 'Mi actividad', 'My activity'),
      tr(
        context,
        'Respuestas y movimientos de medallas',
        'Answers and medal transactions',
      ),
      '/activity',
    ),
    (
      Icons.home_outlined,
      tr(context, 'Inicio', 'Home'),
      tr(
        context,
        'Tu actividad y accesos rápidos',
        'Your activity and shortcuts',
      ),
      '/home',
    ),
    (
      Icons.school_outlined,
      tr(context, 'Tutores', 'Tutors'),
      tr(
        context,
        'Explora el catálogo de demostración',
        'Explore the demo catalog',
      ),
      '/tutors',
    ),
    (
      Icons.forum_outlined,
      tr(context, 'Comunidad', 'Community'),
      tr(
        context,
        'Preguntas y aportes compartidos',
        'Shared questions and contributions',
      ),
      '/feed',
    ),
    (
      Icons.person_outline,
      tr(context, 'Mis datos y privacidad', 'My data & privacy'),
      tr(
        context,
        'Datos personales y seguridad',
        'Personal information and security',
      ),
      '/my-data',
    ),
    (
      Icons.workspace_premium_outlined,
      tr(context, 'Planes', 'Plans'),
      tr(
        context,
        'Opciones de práctica · pagos simulados',
        'Practice options · simulated payments',
      ),
      '/plans',
    ),
    (
      Icons.settings_outlined,
      tr(context, 'Ajustes', 'Settings'),
      tr(
        context,
        'Apariencia, idioma y cuenta',
        'Appearance, language and account',
      ),
      '/settings',
    ),
  ];
  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    builder: (sheet) => SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
              child: Text(
                tr(context, 'Explora Aprueba', 'Explore Aprueba'),
                style: Theme.of(context).textTheme.titleLarge,
              ),
            ),
            for (final entry in entries)
              ListTile(
                minVerticalPadding: 12,
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: c.chip,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(entry.$1, color: c.brand),
                ),
                title: Text(entry.$2),
                subtitle: Text(entry.$3),
                trailing: const Icon(Icons.chevron_right),
                onTap: () {
                  Navigator.pop(sheet);
                  if (entry.$4 == '/my-data' ||
                      entry.$4 == '/plans' ||
                      entry.$4 == '/study-plan' ||
                      entry.$4 == '/activity') {
                    context.push(entry.$4);
                  } else {
                    context.go(entry.$4);
                  }
                },
              ),
          ],
        ),
      ),
    ),
  );
}
