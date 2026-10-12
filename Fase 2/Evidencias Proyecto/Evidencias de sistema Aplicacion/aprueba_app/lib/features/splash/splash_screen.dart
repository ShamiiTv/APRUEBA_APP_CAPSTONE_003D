import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/theme/wf_colors.dart';
import '../../core/widgets/wf_widgets.dart';
import '../auth/auth_providers.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  bool _welcome = false;

  @override
  void initState() {
    super.initState();
    _checkSession();
  }

  Future<void> _checkSession() async {
    await Future.delayed(const Duration(milliseconds: 700));
    final hasSession = await ref.read(authRepositoryProvider).hasSession();
    if (!mounted) return;
    if (hasSession) {
      try {
        final profile = await ref.read(profileProvider.future);
        if (mounted) {
          context.go(profile.onboardingCompleted ? '/home' : '/select-tests');
        }
      } catch (_) {
        if (mounted) context.go('/login');
      }
    } else {
      setState(() => _welcome = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = WfColors.of(context);

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              const Spacer(),
              const WfLogo(height: 190),
              const SizedBox(height: 14),
              Text(
                'Práctica diaria para la PAES. Pocos minutos al día.',
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(fontSize: 13, color: c.muted),
              ),
              const Spacer(),
              if (_welcome) ...[
                FilledButton(
                  onPressed: () => context.go('/register'),
                  child: const Text('Comenzar'),
                ),
                const SizedBox(height: 4),
                TextButton(
                  onPressed: () => context.go('/login'),
                  child: const Text('Ya tengo cuenta'),
                ),
              ] else
                const SizedBox(
                  height: 48,
                  child: Center(child: CircularProgressIndicator()),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
