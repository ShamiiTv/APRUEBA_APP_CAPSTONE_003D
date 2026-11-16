import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/l10n/l10n.dart';
import '../auth/auth_providers.dart';
import '../subscription/premium_gate_screen.dart';

/// Protege también los accesos directos: no muestra contenido con perfil
/// pendiente, fallido o sin el plan Todas las pruebas vigente.
class TutorAccessGate extends ConsumerWidget {
  const TutorAccessGate({super.key, required this.builder});
  final Widget Function(BuildContext, WidgetRef) builder;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ref
        .watch(profileProvider)
        .when(
          skipLoadingOnRefresh: false,
          loading: () =>
              const Scaffold(body: Center(child: CircularProgressIndicator())),
          error: (error, stack) => Scaffold(
            appBar: AppBar(),
            body: Center(
              child: FilledButton(
                onPressed: () => ref.invalidate(profileProvider),
                child: Text(
                  tr(
                    context,
                    'Reintentar cargar tu plan',
                    'Retry loading your plan',
                  ),
                ),
              ),
            ),
          ),
          data: (profile) => profile.hasTutorAccess
              ? builder(context, ref)
              : const PremiumGateScreen(),
        );
  }
}
