import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/l10n/l10n.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/wf_colors.dart';
import '../../core/utils/validators.dart';
import '../../core/widgets/wf_widgets.dart';
import '../practice/practice_providers.dart';
import 'auth_providers.dart';
import 'auth_repository.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _consent = true;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  Future<void> _register() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    if (!_consent) {
      setState(
        () => _error = tr(
          context,
          'Debes aceptar los términos para continuar.',
          'You must accept the terms to continue.',
        ),
      );
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      await ref
          .read(authRepositoryProvider)
          .register(
            _nameCtrl.text,
            _emailCtrl.text,
            _passCtrl.text,
            consent: _consent,
            locale: ref.read(localeProvider).languageCode,
          );
      ref.invalidate(profileProvider);
      ref.invalidate(progressProvider);
      if (mounted) context.go('/select-tests');
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = WfColors.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(tr(context, 'Crea tu cuenta', 'Create your account')),
        leading: BackButton(onPressed: () => context.go('/login')),
      ),
      body: SafeArea(
        child: Form(
          key: _formKey,
          autovalidateMode: AutovalidateMode.onUserInteraction,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
            children: [
              Text(
                tr(
                  context,
                  'Con tu nombre y correo desbloqueas 10 preguntas diarias gratis.',
                  'With your name and email you unlock 10 free questions a day.',
                ),
                style: GoogleFonts.inter(
                  fontSize: 13,
                  color: c.muted,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 8),
              TextFormField(
                controller: _nameCtrl,
                textInputAction: TextInputAction.next,
                inputFormatters: [lettersFormatter],
                decoration: InputDecoration(
                  hintText: tr(context, 'Nombre completo', 'Full name'),
                ),
                validator: (v) => vName(context, v),
              ),
              const SizedBox(height: 9),
              TextFormField(
                controller: _emailCtrl,
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.next,
                decoration: InputDecoration(
                  hintText: tr(context, 'Correo electrónico', 'Email'),
                ),
                validator: (v) => vEmail(context, v),
              ),
              const SizedBox(height: 9),
              TextFormField(
                controller: _passCtrl,
                obscureText: true,
                decoration: InputDecoration(
                  hintText: tr(
                    context,
                    'Contraseña (mín. 8, con letra y número)',
                    'Password (min. 8, with a letter and a number)',
                  ),
                ),
                validator: (v) => vPassword(context, v),
              ),
              const SizedBox(height: 11),
              Card(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(13, 6, 13, 6),
                  child: Row(
                    children: [
                      Switch(
                        value: _consent,
                        onChanged: (v) => setState(() => _consent = v),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          tr(
                            context,
                            'Acepto términos y el tratamiento de datos.',
                            'I accept the terms and the processing of my data.',
                          ),
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            color: c.muted,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 10),
              Align(
                alignment: Alignment.centerLeft,
                child: WfTag(
                  text: tr(context, '+10 preguntas/día', '+10 questions/day'),
                  bg: Color(0x2110B981),
                  fg: Color(0xFF059669),
                ),
              ),
              if (_error != null) ...[
                const SizedBox(height: 10),
                Text(_error!, style: TextStyle(color: c.danger)),
              ],
              const SizedBox(height: 14),
              FilledButton(
                onPressed: _loading ? null : _register,
                child: _loading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors.azul,
                        ),
                      )
                    : Text(
                        tr(
                          context,
                          'Crear cuenta y empezar',
                          'Create account and start',
                        ),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
