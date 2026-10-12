import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/l10n/l10n.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/wf_colors.dart';
import '../../core/utils/validators.dart';
import '../../core/widgets/address_form.dart';
import '../../data/user_profile.dart';
import '../auth/auth_providers.dart';
import '../auth/auth_repository.dart';

import 'package:flutter/services.dart';

class MyDataScreen extends ConsumerStatefulWidget {
  const MyDataScreen({super.key});

  @override
  ConsumerState<MyDataScreen> createState() => _MyDataScreenState();
}

class _MyDataScreenState extends ConsumerState<MyDataScreen> {
  final _personalKey = GlobalKey<FormState>();
  final _passKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _age = TextEditingController();
  final _school = TextEditingController();
  final _cur = TextEditingController();
  final _new = TextEditingController();
  final _confirm = TextEditingController();
  final _addr = AddressFormController();

  bool _loaded = false;
  bool _savingPersonal = false;
  bool _savingAddr = false;
  bool _savingPass = false;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    try {
      final u = await ref.read(profileProvider.future);
      if (!mounted) return;
      setState(() {
        _name.text = u.name;
        _phone.text = u.phone ?? '';
        _age.text = u.age?.toString() ?? '';
        _school.text = u.school ?? '';
        _addr.load(u.address);
        _loaded = true;
      });
    } catch (_) {
      // El error se muestra con el estado del perfil.
    }
  }

  @override
  void dispose() {
    for (final c in [_name, _phone, _age, _school, _cur, _new, _confirm]) {
      c.dispose();
    }
    _addr.dispose();
    super.dispose();
  }

  void _snack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  Future<void> _savePersonal() async {
    if (!(_personalKey.currentState?.validate() ?? false)) return;
    setState(() => _savingPersonal = true);
    try {
      final data = <String, dynamic>{
        'name': _name.text.trim(),
        'phone': _phone.text.trim(),
      };
      if (_age.text.trim().isNotEmpty) {
        data['age'] = int.parse(_age.text.trim());
      }
      if (_school.text.trim().isNotEmpty) data['school'] = _school.text.trim();

      await ref.read(authRepositoryProvider).updateProfile(data);
      await ref.read(profileProvider.notifier).refresh();
      if (!mounted) return;
      _snack(tr(context, 'Datos guardados ✓', 'Saved ✓'));
    } on ApiException catch (e) {
      _snack(e.message);
    } finally {
      if (mounted) setState(() => _savingPersonal = false);
    }
  }

  Future<void> _saveAddress() async {
    if (!_addr.validate()) return;
    setState(() => _savingAddr = true);
    try {
      await ref.read(authRepositoryProvider).updateProfile({
        'address': _addr.build().toJson(),
      });
      await ref.read(profileProvider.notifier).refresh();
      if (!mounted) return;
      _snack(tr(context, 'Domicilio guardado ✓', 'Address saved ✓'));
    } on ApiException catch (e) {
      _snack(e.message);
    } finally {
      if (mounted) setState(() => _savingAddr = false);
    }
  }

  Future<void> _changePassword() async {
    if (!(_passKey.currentState?.validate() ?? false)) return;
    setState(() => _savingPass = true);
    try {
      await ref
          .read(authRepositoryProvider)
          .changePassword(_cur.text, _new.text);
      _cur.clear();
      _new.clear();
      _confirm.clear();
      if (!mounted) return;
      _snack(tr(context, 'Contraseña actualizada ✓', 'Password updated ✓'));
    } on ApiException catch (e) {
      _snack(e.message);
    } finally {
      if (mounted) setState(() => _savingPass = false);
    }
  }

  Widget _section(String text, WfColors c) => Padding(
    padding: const EdgeInsets.only(top: 22, bottom: 8),
    child: Text(
      text.toUpperCase(),
      style: GoogleFonts.montserrat(
        fontSize: 10,
        fontWeight: FontWeight.w700,
        letterSpacing: 0.8,
        color: c.muted,
      ),
    ),
  );

  Widget _summaryRow(String label, String? value, WfColors c) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 5),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 96,
          child: Text(
            label,
            style: GoogleFonts.inter(fontSize: 12, color: c.muted),
          ),
        ),
        Expanded(
          child: Text(
            (value == null || value.isEmpty) ? '—' : value,
            style: GoogleFonts.inter(
              fontSize: 12.5,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    ),
  );

  Widget _saveButton({
    required bool busy,
    required VoidCallback onTap,
    required String label,
  }) => FilledButton(
    onPressed: busy ? null : onTap,
    child: busy
        ? const SizedBox(
            height: 20,
            width: 20,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: AppColors.azul,
            ),
          )
        : Text(label),
  );

  @override
  Widget build(BuildContext context) {
    final c = WfColors.of(context);
    final profile = ref.watch(profileProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(tr(context, 'Mis datos y privacidad', 'My data & privacy')),
      ),
      body: profile.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Text(
            e is ApiException ? e.message : 'No se pudo cargar tu perfil.',
            style: TextStyle(color: c.danger),
          ),
        ),
        data: (u) {
          if (!_loaded) return const Center(child: CircularProgressIndicator());
          return _content(context, u, c);
        },
      ),
    );
  }

  Widget _content(BuildContext context, UserProfile u, WfColors c) {
    final plan = u.plan == 'uni'
        ? tr(context, '1 prueba ilimitada', '1 test unlimited')
        : u.plan == 'all'
        ? tr(context, 'Todas las pruebas', 'All tests')
        : tr(context, 'Gratis', 'Free');
    final addr = u.address;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 28),
      children: [
        _section(
          tr(context, 'Resumen de tu información', 'Your information'),
          c,
        ),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(13),
            child: Column(
              children: [
                _summaryRow(tr(context, 'Nombre', 'Name'), u.name, c),
                _summaryRow(tr(context, 'Correo', 'Email'), u.email, c),
                _summaryRow(tr(context, 'Celular', 'Phone'), u.phone, c),
                _summaryRow(tr(context, 'Edad', 'Age'), u.age?.toString(), c),
                _summaryRow(tr(context, 'Colegio', 'School'), u.school, c),
                _summaryRow(
                  tr(context, 'Domicilio', 'Address'),
                  addr == null
                      ? null
                      : '${addr.summary} (${housingLabel(context, addr.housingType)})',
                  c,
                ),
                _summaryRow(
                  tr(context, 'Idioma', 'Language'),
                  u.locale == 'en' ? 'English' : 'Español',
                  c,
                ),
                _summaryRow(
                  tr(context, 'Recordatorio', 'Reminder'),
                  u.dailyReminder
                      ? tr(
                          context,
                          'Activo · ${u.reminderTime}',
                          'On · ${u.reminderTime}',
                        )
                      : tr(context, 'Desactivado', 'Off'),
                  c,
                ),
                _summaryRow(tr(context, 'Plan', 'Plan'), plan, c),
              ],
            ),
          ),
        ),
        _section(tr(context, 'Datos personales', 'Personal details'), c),
        Form(
          key: _personalKey,
          autovalidateMode: AutovalidateMode.onUserInteraction,
          child: Column(
            children: [
              TextFormField(
                controller: _name,
                inputFormatters: [lettersFormatter],
                decoration: InputDecoration(
                  hintText: tr(context, 'Nombre completo', 'Full name'),
                ),
                validator: (v) => vName(context, v),
              ),
              const SizedBox(height: 10),
              TextFormField(
                key: ValueKey('email-${u.email}'),
                initialValue: u.email,
                enabled: false,
                decoration: InputDecoration(
                  hintText: tr(context, 'Correo', 'Email'),
                ),
              ),
              Align(
                alignment: Alignment.centerLeft,
                child: Padding(
                  padding: const EdgeInsets.only(top: 4, bottom: 2),
                  child: Text(
                    tr(
                      context,
                      'El correo no se puede modificar.',
                      'Your email cannot be changed.',
                    ),
                    style: GoogleFonts.inter(fontSize: 11, color: c.muted),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              TextFormField(
                controller: _phone,
                keyboardType: TextInputType.phone,
                inputFormatters: [phoneFormatter],
                decoration: InputDecoration(
                  hintText: tr(
                    context,
                    'Celular (ej: +56 9 1234 5678)',
                    'Phone (e.g. +56 9 1234 5678)',
                  ),
                ),
                validator: (v) => vPhone(context, v),
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _age,
                keyboardType: TextInputType.number,
                inputFormatters: [
                  digitsFormatter,
                  LengthLimitingTextInputFormatter(2),
                ],
                decoration: InputDecoration(
                  hintText: tr(context, 'Edad', 'Age'),
                ),
                validator: (v) => vAge(context, v, required: false),
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _school,
                inputFormatters: [schoolFormatter],
                decoration: InputDecoration(
                  hintText: tr(context, 'Colegio / Liceo', 'School'),
                ),
                validator: (v) => vSchool(context, v, required: false),
              ),
              const SizedBox(height: 14),
              _saveButton(
                busy: _savingPersonal,
                onTap: _savePersonal,
                label: tr(context, 'Guardar datos', 'Save details'),
              ),
            ],
          ),
        ),
        _section(tr(context, 'Domicilio', 'Home address'), c),
        AddressForm(controller: _addr),
        const SizedBox(height: 14),
        _saveButton(
          busy: _savingAddr,
          onTap: _saveAddress,
          label: tr(context, 'Guardar domicilio', 'Save address'),
        ),
        _section(tr(context, 'Cambiar contraseña', 'Change password'), c),
        Form(
          key: _passKey,
          autovalidateMode: AutovalidateMode.onUserInteraction,
          child: Column(
            children: [
              TextFormField(
                controller: _cur,
                obscureText: true,
                decoration: InputDecoration(
                  hintText: tr(
                    context,
                    'Contraseña actual',
                    'Current password',
                  ),
                ),
                validator: (v) => (v ?? '').isEmpty
                    ? tr(
                        context,
                        'Ingresa tu contraseña actual',
                        'Enter your current password',
                      )
                    : null,
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _new,
                obscureText: true,
                decoration: InputDecoration(
                  hintText: tr(context, 'Nueva contraseña', 'New password'),
                ),
                validator: (v) => vPassword(context, v),
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _confirm,
                obscureText: true,
                decoration: InputDecoration(
                  hintText: tr(
                    context,
                    'Repite la nueva contraseña',
                    'Repeat new password',
                  ),
                ),
                validator: (v) => vConfirm(context, v, _new.text),
              ),
              const SizedBox(height: 14),
              _saveButton(
                busy: _savingPass,
                onTap: _changePassword,
                label: tr(context, 'Cambiar contraseña', 'Change password'),
              ),
            ],
          ),
        ),
        _section(tr(context, 'Privacidad', 'Privacy'), c),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(13),
            child: Text(
              tr(
                context,
                'Guardamos solo los datos necesarios para tu cuenta: nombre, correo, celular, colegio, edad y domicilio. '
                    'Se usan para ampliar tu cuota diaria y personalizar tu experiencia. '
                    'Tu contraseña se guarda cifrada. Puedes eliminar tu cuenta y todos tus datos desde Ajustes.',
                'We only store the data needed for your account: name, email, phone, school, age and address. '
                    'It is used to extend your daily quota and personalize your experience. '
                    'Your password is stored encrypted. You can delete your account and all your data from Settings.',
              ),
              style: GoogleFonts.inter(
                fontSize: 12,
                color: c.muted,
                height: 1.5,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
