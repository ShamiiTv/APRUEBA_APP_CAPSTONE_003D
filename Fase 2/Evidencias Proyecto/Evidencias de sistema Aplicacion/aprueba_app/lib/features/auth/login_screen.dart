import '../../core/widgets/app_version.dart';

import 'package:flutter/material.dart';

import '../../core/l10n/l10n.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/theme/wf_colors.dart';
import '../practice/practice_providers.dart';
import 'auth_providers.dart';
import 'auth_repository.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  // Amarillo del logo y un tono más oscuro para texto legible sobre fondo claro.
  static const _amarillo = Color(0xFFF5AF41);

  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _loading = false;
  bool _obscure = true;
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
      ref.invalidate(progressSnapshotProvider);
      ref.invalidate(progressProvider);
      if (mounted) context.go('/home');
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Widget _miniLogo() {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.arrow_drop_up, color: _amarillo, size: 24),
            Transform.translate(
              offset: const Offset(0, -6),
              child: Container(
                width: 10,
                height: 18,
                decoration: BoxDecoration(
                  color: _amarillo,
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(width: 10),
        Text(
          'Aprueba',
          style: GoogleFonts.montserrat(
            fontSize: 26,
            fontWeight: FontWeight.w800,
            color: WfColors.of(context).ink,
          ),
        ),
      ],
    );
  }

  Widget _label(String text) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Text(
          text,
          style: GoogleFonts.inter(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: WfColors.of(context).ink,
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = WfColors.of(context);

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: c.bg,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: c.line),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.06),
                      blurRadius: 24,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _miniLogo(),
                    const SizedBox(height: 8),
                    Text(
                      appVersionLabel(context),
                      style: TextStyle(color: c.muted, fontSize: 11),
                    ),
                    const SizedBox(height: 28),
                    Text(
                      tr(
                        context,
                        'Ingresa a tu cuenta',
                        'Log in to your account',
                      ),
                      style: GoogleFonts.montserrat(
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                        color: WfColors.of(context).ink,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      tr(
                        context,
                        'Continúa con tu racha de preparación PAES 2026.',
                        'Continue your PAES 2026 preparation streak.',
                      ),
                      style: GoogleFonts.inter(fontSize: 14, color: c.muted),
                    ),
                    const SizedBox(height: 22),
                    _label(tr(context, 'Correo electrónico', 'Email')),
                    TextField(
                      controller: _emailCtrl,
                      keyboardType: TextInputType.emailAddress,
                      textInputAction: TextInputAction.next,
                      decoration: InputDecoration(
                        hintText: tr(
                          context,
                          'tucorreo@ejemplo.cl',
                          'youremail@example.com',
                        ),
                        hintStyle: GoogleFonts.inter(
                          fontSize: 14,
                          color: const Color(0xFF94A3B8),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    _label(tr(context, 'Contraseña', 'Password')),
                    TextField(
                      controller: _passCtrl,
                      obscureText: _obscure,
                      onSubmitted: (_) {
                        if (!_loading) _login();
                      },
                      decoration: InputDecoration(
                        hintText: tr(context, 'Tu contraseña', 'Your password'),
                        hintStyle: GoogleFonts.inter(
                          fontSize: 14,
                          color: const Color(0xFF94A3B8),
                        ),
                        suffixIcon: IconButton(
                          tooltip: _obscure
                              ? tr(
                                  context,
                                  'Mostrar contraseña',
                                  'Show password',
                                )
                              : tr(
                                  context,
                                  'Ocultar contraseña',
                                  'Hide password',
                                ),
                          icon: Icon(
                            _obscure
                                ? Icons.visibility_outlined
                                : Icons.visibility_off_outlined,
                          ),
                          onPressed: () => setState(() => _obscure = !_obscure),
                        ),
                      ),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 10),
                      Text(_error!, style: TextStyle(color: c.danger)),
                    ],
                    const SizedBox(height: 22),
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: FilledButton(
                        style: FilledButton.styleFrom(
                          backgroundColor: c.brand,
                          foregroundColor: c.onBrand,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                          textStyle: GoogleFonts.montserrat(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        onPressed: _loading ? null : _login,
                        child: _loading
                            ? SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: c.onBrand,
                                ),
                              )
                            : Text(tr(context, 'Iniciar sesión', 'Log in')),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Center(
                      child: TextButton(
                        onPressed: () => context.go('/forgot-password'),
                        child: Text(
                          tr(
                            context,
                            '¿Olvidaste tu contraseña?',
                            'Forgot your password?',
                          ),
                          style: GoogleFonts.inter(
                            fontSize: 13,
                            color: c.muted,
                          ),
                        ),
                      ),
                    ),
                    Center(
                      child: Wrap(
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          Text(
                            tr(context, '¿No tienes cuenta? ', 'No account? '),
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              color: c.muted,
                            ),
                          ),
                          GestureDetector(
                            onTap: () => context.go('/register'),
                            child: Text(
                              tr(context, 'Regístrate aquí', 'Sign up here'),
                              style: GoogleFonts.inter(
                                fontSize: 14,
                                fontWeight: FontWeight.w800,
                                color: c.brand,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
