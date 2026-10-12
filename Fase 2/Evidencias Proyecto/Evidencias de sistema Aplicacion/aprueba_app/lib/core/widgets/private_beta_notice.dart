import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class PrivateBetaNotice extends StatelessWidget {
  const PrivateBetaNotice({super.key, required this.feature});
  final String feature;
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Prueba privada')),
    body: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.construction, size: 48),
          const SizedBox(height: 20),
          Text(
            feature,
            style: Theme.of(context).textTheme.titleLarge,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 12),
          const Text(
            'Esta función todavía no está habilitada en la prueba compartida. Puedes probar práctica, medallas, grupos y comunidad con tu misma cuenta de la web.',
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: () => context.go('/home'),
            child: const Text('Volver al inicio'),
          ),
        ],
      ),
    ),
  );
}
