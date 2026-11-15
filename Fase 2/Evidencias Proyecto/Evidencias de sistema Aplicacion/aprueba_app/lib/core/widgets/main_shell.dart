import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/auth_providers.dart';
import '../l10n/l10n.dart';
import 'app_menu.dart';
import 'medal_toast.dart';

class MainShell extends ConsumerWidget {
  const MainShell({super.key, required this.navigationShell});
  final StatefulNavigationShell navigationShell;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final branch = navigationShell.currentIndex;
    final selected = branch == 0
        ? 0
        : branch == 1
        ? 1
        : branch == 2
        ? 3
        : 4;
    return Scaffold(
      body: MedalRewardHost(child: navigationShell),
      bottomNavigationBar: NavigationBar(
        height: 76,
        selectedIndex: selected,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        onDestinationSelected: (index) {
          if (index == 2) {
            context.go('/practice');
            return;
          }
          if (index == 4) {
            showApruebaMenu(context);
            return;
          }
          final next = index == 3 ? 2 : index;
          if (next == branch) return;
          navigationShell.goBranch(next);
          ref.read(profileProvider.notifier).refresh();
        },
        destinations: [
          NavigationDestination(
            icon: const Icon(Icons.home_outlined),
            selectedIcon: const Icon(Icons.home_rounded),
            label: tr(context, 'Inicio', 'Home'),
          ),
          NavigationDestination(
            icon: const Icon(Icons.emoji_events_outlined),
            selectedIcon: const Icon(Icons.emoji_events_rounded),
            label: tr(context, 'Medallas', 'Medals'),
          ),
          NavigationDestination(
            icon: const Icon(Icons.play_circle_outline_rounded),
            label: tr(context, 'Practicar', 'Practice'),
          ),
          NavigationDestination(
            icon: const Icon(Icons.groups_outlined),
            selectedIcon: const Icon(Icons.groups_rounded),
            label: tr(context, 'Grupos', 'Groups'),
          ),
          NavigationDestination(
            icon: const Icon(Icons.grid_view_rounded),
            label: tr(context, 'Más', 'More'),
          ),
        ],
      ),
    );
  }
}
