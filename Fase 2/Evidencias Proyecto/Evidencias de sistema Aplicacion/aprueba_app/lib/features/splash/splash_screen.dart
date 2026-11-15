import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/app_colors.dart';
import '../auth/auth_providers.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  // Amarillo del diseño. Si AppColors ya tiene uno, reemplázalo por ese.
  static const _amarillo = Color(0xFFF5AF41);

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
      context.go('/home');
    } else {
      setState(() => _welcome = true);
    }
  }

  Widget _pencil() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Icon(Icons.arrow_drop_up, color: _amarillo, size: 32),
        Transform.translate(
          offset: const Offset(0, -8),
          child: Container(
            width: 14,
            height: 24,
            decoration: BoxDecoration(
              color: _amarillo,
              borderRadius: BorderRadius.circular(4),
            ),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(22),
          child: Column(
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 24),
                decoration: BoxDecoration(
                  color: AppColors.azul,
                  borderRadius: BorderRadius.circular(28),
                ),
                child: Column(
                  children: [
                    _pencil(),
                    const SizedBox(height: 14),
                    Text(
                      'Aprueba',
                      style: GoogleFonts.montserrat(
                        fontSize: 38,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      'Práctica diaria para la PAES. Pocos minutos al día.',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        color: Colors.white.withValues(alpha: 0.85),
                      ),
                    ),
                  ],
                ),
              ),
              const Spacer(),
              if (_welcome) ...[
                SizedBox(
                  width: double.infinity,
                  height: 54,
                  child: FilledButton(
                    style: FilledButton.styleFrom(
                      backgroundColor: _amarillo,
                      foregroundColor: AppColors.azul,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      textStyle: GoogleFonts.montserrat(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    onPressed: () => context.go('/register'),
                    child: const Text('Comenzar'),
                  ),
                ),
                const SizedBox(height: 8),
                TextButton(
                  style: TextButton.styleFrom(
                    foregroundColor: AppColors.azul,
                    textStyle: GoogleFonts.montserrat(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  onPressed: () => context.go('/login'),
                  child: const Text('Ya tengo cuenta'),
                ),
              ] else
                const SizedBox(
                  height: 62,
                  child: Center(child: CircularProgressIndicator()),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
