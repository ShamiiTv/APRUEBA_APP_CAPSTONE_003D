import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/l10n/l10n.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/wf_colors.dart';
import '../../core/utils/validators.dart';
import 'auth_providers.dart';
import 'auth_repository.dart';

/// Recuperar contraseña: 1) pedir el correo, 2) ingresar el código recibido y la nueva contraseña.
/// El correo está simulado: en desarrollo el código aparece en la consola de la API.
class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() =>
      _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _emailKey = GlobalKey<FormState>();
  final _resetKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _token = TextEditingController();
  final _password = TextEditingController();
  bool _sent = false;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _token.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _sendEmail() async {
    if (!(_emailKey.currentState?.validate() ?? false)) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(authRepositoryProvider).forgotPassword(_email.text);
      if (mounted) setState(() => _sent = true);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _reset() async {
    if (!(_resetKey.currentState?.validate() ?? false)) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref
          .read(authRepositoryProvider)
          .resetPassword(_token.text, _password.text);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            tr(
              context,
              'Contraseña actualizada. Ya puedes iniciar sesión.',
              'Password updated. You can sign in now.',
            ),
          ),
        ),
      );
      context.go('/login');
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Widget _spinner() => const SizedBox(
    height: 20,
    width: 20,
    child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.azul),
  );

  @override
  Widget build(BuildContext context) {
    final c = WfColors.of(context);
    final tt = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(
        title: Text(tr(context, 'Recuperar contraseña', 'Reset password')),
        leading: BackButton(onPressed: () => context.go('/login')),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
          children: [
            if (!_sent) ...[
              Text(
                tr(
                  context,
                  '¿Olvidaste tu contraseña?',
                  'Forgot your password?',
                ),
                style: tt.headlineSmall,
              ),
              const SizedBox(height: 6),
              Text(
                tr(
                  context,
                  'Escribe tu correo y te enviaremos un enlace para crear una nueva.',
                  "Enter your email and we'll send you a link to create a new one.",
                ),
                style: GoogleFonts.inter(
                  fontSize: 13,
                  color: c.muted,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 14),
              Form(
                key: _emailKey,
                child: TextFormField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  decoration: InputDecoration(
                    hintText: tr(context, 'Correo electrónico', 'Email'),
                  ),
                  validator: (v) => vEmail(context, v),
                ),
              ),
              if (_error != null) ...[
                const SizedBox(height: 10),
                Text(_error!, style: TextStyle(color: c.danger)),
              ],
              const SizedBox(height: 14),
              FilledButton(
                onPressed: _busy ? null : _sendEmail,
                child: _busy
                    ? _spinner()
                    : Text(tr(context, 'Enviar enlace', 'Send link')),
              ),
            ] else ...[
              Text(
                tr(context, 'Revisa tu correo', 'Check your email'),
                style: tt.headlineSmall,
              ),
              const SizedBox(height: 6),
              Text(
                tr(
                  context,
                  'Si el correo existe, te enviamos un código para restablecer tu contraseña. (En esta versión de desarrollo el código se muestra en la consola de la API.)',
                  'If the email exists, we sent you a code to reset your password. (In this development build the code is printed in the API console.)',
                ),
                style: GoogleFonts.inter(
                  fontSize: 13,
                  color: c.muted,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 14),
              Form(
                key: _resetKey,
                child: Column(
                  children: [
                    TextFormField(
                      controller: _token,
                      decoration: InputDecoration(
                        hintText: tr(
                          context,
                          'Código de recuperación',
                          'Recovery code',
                        ),
                      ),
                      validator: (v) => (v == null || v.trim().isEmpty)
                          ? tr(context, 'Ingresa el código', 'Enter the code')
                          : null,
                    ),
                    const SizedBox(height: 9),
                    TextFormField(
                      controller: _password,
                      obscureText: true,
                      decoration: InputDecoration(
                        hintText: tr(
                          context,
                          'Nueva contraseña (mín. 8, con letra y número)',
                          'New password (min. 8, letter and number)',
                        ),
                      ),
                      validator: (v) => vPassword(context, v),
                    ),
                  ],
                ),
              ),
              if (_error != null) ...[
                const SizedBox(height: 10),
                Text(_error!, style: TextStyle(color: c.danger)),
              ],
              const SizedBox(height: 14),
              FilledButton(
                onPressed: _busy ? null : _reset,
                child: _busy
                    ? _spinner()
                    : Text(
                        tr(context, 'Cambiar contraseña', 'Change password'),
                      ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
