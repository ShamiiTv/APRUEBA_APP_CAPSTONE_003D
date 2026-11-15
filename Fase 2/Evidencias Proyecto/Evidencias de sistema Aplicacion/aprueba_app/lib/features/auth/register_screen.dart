import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/l10n/l10n.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/wf_colors.dart';
import '../../core/utils/validators.dart';
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
  bool _consent = false;
  bool _hidePassword = true;
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
      if (mounted) context.go('/verify-email');
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = WfColors.of(context);
    InputDecoration fieldDecoration(String placeholder) => InputDecoration(
      hintText: placeholder,
      hintStyle: TextStyle(color: c.muted),
      filled: true,
      fillColor: c.soft,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: c.line),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: c.brand, width: 1.5),
      ),
    );

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
              TextFormField(
                controller: _nameCtrl,
                autofillHints: const [AutofillHints.name],
                textCapitalization: TextCapitalization.words,
                textInputAction: TextInputAction.next,
                inputFormatters: [lettersFormatter],
                decoration: fieldDecoration(
                  tr(context, 'Nombre completo', 'Full name'),
                ),
                validator: (v) => vName(context, v),
              ),
              const SizedBox(height: 9),
              TextFormField(
                controller: _emailCtrl,
                autofillHints: const [AutofillHints.email],
                autocorrect: false,
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.next,
                decoration: fieldDecoration(
                  tr(context, 'Correo electrónico', 'Email'),
                ),
                validator: (v) => vEmail(context, v),
              ),
              const SizedBox(height: 9),
              TextFormField(
                controller: _passCtrl,
                obscureText: _hidePassword,
                autofillHints: const [AutofillHints.newPassword],
                textInputAction: TextInputAction.done,
                enableSuggestions: false,
                autocorrect: false,
                decoration:
                    fieldDecoration(tr(context, 'Contraseña', 'Password'))
                        .copyWith(
                          suffixIcon: IconButton(
                            tooltip: tr(
                              context,
                              _hidePassword
                                  ? 'Mostrar contraseña'
                                  : 'Ocultar contraseña',
                              _hidePassword ? 'Show password' : 'Hide password',
                            ),
                            onPressed: () =>
                                setState(() => _hidePassword = !_hidePassword),
                            icon: Icon(
                              _hidePassword
                                  ? Icons.visibility_outlined
                                  : Icons.visibility_off_outlined,
                            ),
                          ),
                          helperText: tr(
                            context,
                            '8 caracteres, una letra y un número.',
                            '8 characters, a letter and a number.',
                          ),
                          helperMaxLines: 2,
                        ),
                validator: (v) => vPassword(context, v),
              ),
              const SizedBox(height: 11),
              Container(
                decoration: BoxDecoration(
                  color: c.soft,
                  borderRadius: BorderRadius.circular(28),
                  border: Border.all(color: c.line),
                ),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(13, 6, 13, 6),
                  child: Row(
                    children: [
                      Switch(
                        value: _consent,
                        activeThumbColor: Colors.white,
                        activeTrackColor: c.brand,
                        inactiveThumbColor: Colors.white,
                        inactiveTrackColor: c.line,
                        trackOutlineColor: const WidgetStatePropertyAll(
                          Colors.transparent,
                        ),
                        onChanged: _loading
                            ? null
                            : (v) => setState(() => _consent = v),
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
                    : Text(tr(context, 'Crear cuenta', 'Create account')),
              ),
              TextButton(
                onPressed: _loading ? null : () => context.go('/login'),
                child: Text(
                  tr(
                    context,
                    '¿Ya tienes cuenta? Inicia sesión',
                    'Already have an account? Sign in',
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
