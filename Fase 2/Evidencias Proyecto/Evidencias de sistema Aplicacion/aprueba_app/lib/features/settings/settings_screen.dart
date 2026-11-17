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

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  bool _themeSaving = false;

  Future<void> _setTheme(bool dark) async {
    final repository = ref.read(authRepositoryProvider);
    final profile = ref.read(profileProvider.notifier);
    final theme = ref.read(themeModeProvider.notifier);
    setState(() => _themeSaving = true);
    try {
      await theme.save(dark ? ThemeMode.dark : ThemeMode.light, () async {
        await repository.updateProfile({'theme': dark ? 'dark' : 'light'});
        await profile.refresh();
      });
    } on ApiException catch (e) {
      if (mounted) _snack(context, e.message);
    } finally {
      if (mounted) setState(() => _themeSaving = false);
    }
  }

  static String _planLabel(BuildContext c, String plan) {
    switch (plan) {
      case 'uni':
        return tr(c, '1 prueba ilimitada', '1 test unlimited');
      case 'all':
        return tr(c, 'Todas las pruebas', 'All tests');
      default:
        return tr(c, 'Gratis · 10–20/día', 'Free · 10–20/day');
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

  /// Pide la contraseña, elimina la cuenta en el servidor y vuelve al inicio.
  Future<void> _confirmDelete() async {
    final repository = ref.read(authRepositoryProvider);
    final ctrl = TextEditingController();
    String? error;
    bool busy = false;

    final deleted = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialog) {
          final c = WfColors.of(ctx);
          return PopScope(
            canPop: !busy,
            child: AlertDialog(
              title: Text(tr(ctx, 'Eliminar cuenta', 'Delete account')),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      tr(
                        ctx,
                        'Se borrarán tu cuenta, tus medallas y tu progreso. Esta acción no se puede deshacer.',
                        'Your account, medals and progress will be deleted. This cannot be undone.',
                      ),
                    ),
                    const SizedBox(height: 14),
                    TextField(
                      controller: ctrl,
                      obscureText: true,
                      enabled: !busy,
                      decoration: InputDecoration(
                        hintText: tr(
                          ctx,
                          'Confirma con tu contraseña',
                          'Confirm with your password',
                        ),
                      ),
                    ),
                    if (error != null) ...[
                      const SizedBox(height: 10),
                      Text(error!, style: TextStyle(color: c.danger)),
                    ],
                  ],
                ),
              ),
              actionsPadding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
              actionsOverflowDirection: VerticalDirection.down,
              actions: [
                OutlinedButton(
                  onPressed: busy ? null : () => Navigator.of(ctx).pop(false),
                  child: Text(tr(ctx, 'Cancelar', 'Cancel')),
                ),
                FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: c.danger,
                    foregroundColor: Colors.white,
                  ),
                  onPressed: busy
                      ? null
                      : () async {
                          if (ctrl.text.isEmpty) {
                            setDialog(
                              () => error = tr(
                                ctx,
                                'Ingresa tu contraseña',
                                'Enter your password',
                              ),
                            );
                            return;
                          }
                          setDialog(() {
                            busy = true;
                            error = null;
                          });
                          try {
                            await repository.deleteAccount(ctrl.text);
                            if (ctx.mounted) Navigator.of(ctx).pop(true);
                          } on ApiException catch (e) {
                            setDialog(() {
                              busy = false;
                              error = e.message;
                            });
                          }
                        },
                  child: busy
                      ? const SizedBox(
                          height: 18,
                          width: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : Text(tr(ctx, 'Eliminar', 'Delete')),
                ),
              ],
            ),
          );
        },
      ),
    );

    ctrl.dispose();
    if (deleted == true) {
      ref.invalidate(profileProvider);
      ref.invalidate(progressProvider);
      ref.invalidate(testsProvider);
      if (mounted) context.go('/splash');
    }
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
  Widget build(BuildContext context) {
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
              child: SwitchListTile.adaptive(
                contentPadding: EdgeInsets.zero,
                title: Text(
                  tr(context, 'Modo oscuro', 'Dark mode'),
                  style: bold,
                ),
                value: mode == ThemeMode.dark,
                onChanged: _themeSaving ? null : _setTheme,
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
                  Expanded(
                    child: Text(
                      tr(
                        context,
                        'Mis recorrecciones · próximamente',
                        'My corrections · coming soon',
                      ),
                      style: bold,
                    ),
                  ),
                  Text('›', style: small),
                ],
              ),
            ),
            rowCard(
              onTap: () => context.push('/plans'),
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
              onTap: _confirmDelete,
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
                        'Borra tu cuenta y todos tus datos de forma permanente.',
                        'Permanently deletes your account and all your data.',
                      ),
                      style: small,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),
            OutlinedButton(
              onPressed: _themeSaving ? null : () => _logout(context, ref),
              child: Text(tr(context, 'Cerrar sesión', 'Log out')),
            ),
          ],
        ),
      ),
    );
  }
}
