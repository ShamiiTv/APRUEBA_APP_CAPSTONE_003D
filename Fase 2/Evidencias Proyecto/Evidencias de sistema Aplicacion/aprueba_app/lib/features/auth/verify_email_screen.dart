import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/l10n/l10n.dart';
import '../../core/theme/wf_colors.dart';
import '../../core/network/api_client.dart';
import 'auth_providers.dart';

class VerifyEmailScreen extends ConsumerStatefulWidget {
  const VerifyEmailScreen({super.key});
  @override
  ConsumerState<VerifyEmailScreen> createState() => _VerifyEmailScreenState();
}

class _VerifyEmailScreenState extends ConsumerState<VerifyEmailScreen> {
  final _password = TextEditingController();
  bool _busy = false;
  String? _message;
  DateTime? _sentAt;
  @override
  void dispose() {
    _password.dispose();
    super.dispose();
  }

  Future<void> _run(bool send) async {
    if (_busy) return;
    if (send &&
        _sentAt != null &&
        DateTime.now().difference(_sentAt!).inSeconds < 60) {
      setState(
        () => _message = tr(
          context,
          'Espera un minuto antes de solicitar otro correo.',
          'Wait one minute before requesting another email.',
        ),
      );
      return;
    }
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      if (send) {
        await ApiClient.dio.post(
          '/auth/verify-email',
          data: {'currentPassword': _password.text},
        );
        _sentAt = DateTime.now();
        _password.clear();
        if (mounted) {
          setState(
            () => _message = tr(
              context,
              'Correo enviado. Revisa tu bandeja y spam.',
              'Email sent. Check your inbox and spam folder.',
            ),
          );
        }
      } else {
        await ref.read(profileProvider.notifier).refresh();
        final profile = await ref.read(profileProvider.future);
        if (!mounted) return;
        if (profile.emailVerified) {
          context.go(profile.onboardingCompleted ? '/home' : '/select-tests');
        } else {
          setState(
            () => _message = tr(
              context,
              'Tu correo aún no está verificado. Abre el enlace y vuelve a comprobar.',
              'Your email is not verified yet. Open the link and try again.',
            ),
          );
        }
      }
    } catch (_) {
      if (mounted) {
        setState(
          () => _message = tr(
            context,
            'No se pudo completar la solicitud. Revisa tu conexión y contraseña e intenta nuevamente.',
            'Unable to complete the request. Check your connection and password and try again.',
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final profile = ref.watch(profileProvider).value;
    final c = WfColors.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(tr(context, 'Confirma tu correo', 'Verify your email')),
      ),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: ListView(
              shrinkWrap: true,
              padding: const EdgeInsets.all(20),
              children: [
                Text(
                  'Aprueba',
                  style: Theme.of(context).textTheme.headlineSmall
                      ?.copyWith(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 24),
                Align(
                  alignment: Alignment.centerLeft,
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: c.soft,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Icon(
                      Icons.mark_email_unread_outlined,
                      size: 32,
                      color: c.brand,
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  tr(
                    context,
                    'Un último paso para activar tu cuenta. Abre el enlace enviado a tu correo y después vuelve aquí para continuar.',
                    'One last step to activate your account. Open the link sent to your email, then return here to continue.',
                  ),
                ),
                if (profile != null)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: c.soft,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: c.line),
                      ),
                      child: Text(
                        profile.email,
                        style: TextStyle(
                          color: c.ink,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: _busy ? null : () => _run(false),
                  child: Text(
                    tr(
                      context,
                      'Ya confirmé mi correo · Continuar',
                      'I verified my email · Continue',
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                const Divider(),
                const SizedBox(height: 16),
                Text(
                  tr(
                    context,
                    '¿No lo recibiste? Revisa spam o solicita otro correo.',
                    'Did not receive it? Check spam or request another email.',
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _password,
                  obscureText: true,
                  autofillHints: const [AutofillHints.password],
                  decoration: InputDecoration(
                    labelText: tr(
                      context,
                      'Contraseña actual para reenviar',
                      'Current password to resend',
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                OutlinedButton(
                  onPressed: _busy ? null : () => _run(true),
                  child: Text(
                    tr(
                      context,
                      'Reenviar correo de verificación',
                      'Resend verification email',
                    ),
                  ),
                ),
                if (_message != null)
                  Semantics(
                    liveRegion: true,
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Text(_message!),
                    ),
                  ),
                TextButton(
                  onPressed: _busy
                      ? null
                      : () async {
                          await ref.read(authRepositoryProvider).logout();
                          ref.invalidate(profileProvider);
                          if (context.mounted) context.go('/login');
                        },
                  child: Text(
                    tr(
                      context,
                      'Usar otra cuenta / Cerrar sesión',
                      'Use another account / Sign out',
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
