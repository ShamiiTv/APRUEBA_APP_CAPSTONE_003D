import 'package:flutter/material.dart';

import '../../core/l10n/l10n.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/wf_colors.dart';
import '../../core/widgets/wf_widgets.dart';
import '../practice/practice_providers.dart';
import 'auth_providers.dart';
import 'auth_repository.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      await ref
          .read(authRepositoryProvider)
          .login(_emailCtrl.text, _passCtrl.text);
      ref.invalidate(profileProvider);
      ref.invalidate(progressProvider);
      final profile = await ref.read(profileProvider.future);
      if (mounted) {
        context.go(profile.onboardingCompleted ? '/home' : '/select-tests');
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = WfColors.of(context);
    final tt = Theme.of(context).textTheme;

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                const WfLogo(height: 130),
                const SizedBox(height: 20),
                Text(
                  tr(context, 'Ingresa a tu cuenta', 'Log in to your account'),
                  style: tt.headlineSmall,
                ),
                const SizedBox(height: 4),
                Text(
                  tr(
                    context,
                    'Continúa tu preparación PAES',
                    'Continue your PAES preparation',
                  ),
                  style: GoogleFonts.inter(fontSize: 13, color: c.muted),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  textInputAction: TextInputAction.next,
                  decoration: InputDecoration(
                    hintText: tr(context, 'Correo electrónico', 'Email'),
                  ),
                ),
                const SizedBox(height: 9),
                TextField(
                  controller: _passCtrl,
                  obscureText: true,
                  decoration: InputDecoration(
                    hintText: tr(context, 'Contraseña', 'Password'),
                  ),
                  onSubmitted: (_) {
                    if (!_loading) _login();
                  },
                ),
                if (_error != null) ...[
                  const SizedBox(height: 10),
                  Text(_error!, style: TextStyle(color: c.danger)),
                ],
                const SizedBox(height: 14),
                FilledButton(
                  onPressed: _loading ? null : _login,
                  child: _loading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AppColors.azul,
                          ),
                        )
                      : Text(tr(context, 'Iniciar sesión', 'Log in')),
                ),
                const SizedBox(height: 4),
                TextButton(
                  onPressed: () => context.go('/forgot-password'),
                  child: Text(
                    tr(
                      context,
                      '¿Olvidaste tu contraseña?',
                      'Forgot your password?',
                    ),
                  ),
                ),
                TextButton(
                  onPressed: () => context.go('/register'),
                  child: Text(
                    tr(
                      context,
                      '¿No tienes cuenta? Regístrate',
                      'No account? Sign up',
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
