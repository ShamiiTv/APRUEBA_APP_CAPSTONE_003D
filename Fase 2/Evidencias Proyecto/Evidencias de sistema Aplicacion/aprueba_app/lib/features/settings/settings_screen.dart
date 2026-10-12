import 'package:flutter/material.dart';

import '../../core/utils/tier_names.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/l10n/l10n.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/theme_controller.dart';
import '../../core/theme/wf_colors.dart';
import '../auth/auth_providers.dart';
import '../auth/auth_repository.dart';
import '../practice/practice_providers.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  static String _planLabel(BuildContext c, String plan) {
    switch (plan) {
      case 'uni':
        return tr(c, '1 prueba ilimitada', '1 test unlimited');
      case 'all':
        return tr(c, 'Todas las pruebas', 'All tests');
      default:
        return tr(c, 'Gratis · 20/día', 'Free · 20/day');
    }
  }

  void _snack(BuildContext context, String msg) {
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  Future<void> _logout(BuildContext context, WidgetRef ref) async {
    await ref.read(authRepositoryProvider).logout();
    ref.invalidate(profileProvider);
    ref.invalidate(progressProvider);
    ref.invalidate(testsProvider);
    if (context.mounted) context.go('/login');
  }

  Future<void> _setLanguage(
    BuildContext context,
    WidgetRef ref,
    String code,
  ) async {
    ref.read(localeProvider.notifier).setCode(code);
    try {
      await ref.read(authRepositoryProvider).updateProfile({'locale': code});
      await ref.read(profileProvider.notifier).refresh();
    } on ApiException catch (e) {
      if (context.mounted) _snack(context, e.message);
    }
  }

  Future<void> _saveReminder(
    BuildContext context,
    WidgetRef ref, {
    bool? enabled,
    String? time,
  }) async {
    try {
      await ref.read(authRepositoryProvider).updateProfile({
        'dailyReminder': ?enabled,
        'reminderTime': ?time,
      });
      await ref.read(profileProvider.notifier).refresh();
    } on ApiException catch (e) {
      if (context.mounted) _snack(context, e.message);
    }
  }

  Future<void> _pickTime(
    BuildContext context,
    WidgetRef ref,
    String current,
  ) async {
    final parts = current.split(':');
    final initial = TimeOfDay(
      hour: int.tryParse(parts.first) ?? 20,
      minute: parts.length > 1 ? int.tryParse(parts[1]) ?? 0 : 0,
    );
    final picked = await showTimePicker(context: context, initialTime: initial);
    if (picked == null || !context.mounted) return;
    final hh = picked.hour.toString().padLeft(2, '0');
    final mm = picked.minute.toString().padLeft(2, '0');
    await _saveReminder(context, ref, time: '$hh:$mm');
  }

  Widget _langChip(
    BuildContext context,
    WidgetRef ref,
    String code,
    String label,
  ) {
    final on = Localizations.localeOf(context).languageCode == code;
    return Padding(
      padding: const EdgeInsets.only(left: 6),
      child: ChoiceChip(
        label: Text(label),
        selected: on,
        showCheckmark: false,
        onSelected: (_) => _setLanguage(context, ref, code),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = WfColors.of(context);
    final tt = Theme.of(context).textTheme;
    final profile = ref.watch(profileProvider).value;
    final mode = ref.watch(themeModeProvider);
    final tests = ref.watch(testsProvider).value ?? const [];

    final name = profile?.name ?? '—';
    final initial = (name.isNotEmpty && name != '—')
        ? name[0].toUpperCase()
        : '?';
    final selected = (profile?.selectedTests ?? const <String>[])
        .map((id) {
          final t = tests.where((t) => t.id == id);
          return t.isEmpty ? id : testName(context, t.first.id, t.first.label);
        })
        .join(', ');
    final reminderOn = profile?.dailyReminder ?? true;
    final reminderTime = profile?.reminderTime ?? '20:00';

    Widget rowCard({required Widget child, VoidCallback? onTap}) => Padding(
      padding: const EdgeInsets.only(bottom: 11),
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 13),
            child: child,
          ),
        ),
      ),
    );

    final bold = GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700);
    final small = GoogleFonts.inter(fontSize: 11, color: c.muted);

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
          children: [
            Text(tr(context, 'Ajustes', 'Settings'), style: tt.headlineSmall),
            const SizedBox(height: 12),
            rowCard(
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 22,
                    backgroundColor: AppColors.oro,
                    child: Text(
                      initial,
                      style: GoogleFonts.montserrat(
                        fontWeight: FontWeight.w800,
                        color: AppColors.azul,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(name, style: bold),
                        Text(
                          profile?.email ?? '',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            color: c.muted,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            rowCard(
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      tr(context, 'Modo oscuro', 'Dark mode'),
                      style: bold,
                    ),
                  ),
                  Switch(
                    value: mode == ThemeMode.dark,
                    onChanged: (v) async {
                      ref
                          .read(themeModeProvider.notifier)
                          .set(v ? ThemeMode.dark : ThemeMode.light);
                      // Se guarda en la base de datos (PATCH /me/settings).
                      try {
                        await ref.read(authRepositoryProvider).updateProfile({
                          'theme': v ? 'dark' : 'light',
                        });
                      } on ApiException catch (e) {
                        if (context.mounted) _snack(context, e.message);
                      }
                    },
                  ),
                ],
              ),
            ),
            rowCard(
              child: Row(
                children: [
                  Expanded(
                    child: Text(tr(context, 'Idioma', 'Language'), style: bold),
                  ),
                  _langChip(context, ref, 'es', 'Español'),
                  _langChip(context, ref, 'en', 'English'),
                ],
              ),
            ),
            rowCard(
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      tr(context, 'Recordatorio diario', 'Daily reminder'),
                      style: bold,
                    ),
                  ),
                  Switch(
                    value: reminderOn,
                    onChanged: (v) => _saveReminder(context, ref, enabled: v),
                  ),
                ],
              ),
            ),
            if (reminderOn)
              rowCard(
                onTap: () => _pickTime(context, ref, reminderTime),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        tr(context, 'Hora del recordatorio', 'Reminder time'),
                        style: bold,
                      ),
                    ),
                    Text('$reminderTime ›', style: small),
                  ],
                ),
              ),
            rowCard(
              onTap: () => context.push('/select-tests?from=settings'),
              child: Row(
                children: [
                  Text(tr(context, 'Mis pruebas', 'My tests'), style: bold),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      '$selected ›',
                      textAlign: TextAlign.right,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: small,
                    ),
                  ),
                ],
              ),
            ),
            rowCard(
              onTap: () => context.push('/corrections'),
              child: Row(
                children: [
                  Text(
                    tr(context, 'Mis recorrecciones', 'My corrections'),
                    style: bold,
                  ),
                  const Spacer(),
                  Text('›', style: small),
                ],
              ),
            ),
            rowCard(
              onTap: () => context.push('/manage-plan'),
              child: Row(
                children: [
                  Text(tr(context, 'Mi plan', 'My plan'), style: bold),
                  const Spacer(),
                  Text(
                    '${_planLabel(context, profile?.plan ?? 'free')} ›',
                    style: small,
                  ),
                ],
              ),
            ),
            rowCard(
              onTap: () => context.push('/my-data'),
              child: Row(
                children: [
                  Text(
                    tr(context, 'Mis datos y privacidad', 'My data & privacy'),
                    style: bold,
                  ),
                  const Spacer(),
                  Text('›', style: small),
                ],
              ),
            ),
            const SizedBox(height: 4),
            Divider(color: c.line),
            const SizedBox(height: 8),
            InkWell(
              borderRadius: BorderRadius.circular(14),
              onTap: () => context.push('/private-beta-info?feature=Eliminación%20de%20cuenta'),
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: c.danger.withValues(alpha: 0.07),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: c.danger, width: 1.5),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      tr(context, 'Eliminar cuenta', 'Delete account'),
                      style: GoogleFonts.montserrat(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: c.danger,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      tr(
                        context,
                        'Función pendiente de integración en esta versión.',
                        'Integration pending in this version.',
                      ),
                      style: small,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),
            OutlinedButton(
              onPressed: () => _logout(context, ref),
              child: Text(tr(context, 'Cerrar sesión', 'Log out')),
            ),
          ],
        ),
      ),
    );
  }
}
