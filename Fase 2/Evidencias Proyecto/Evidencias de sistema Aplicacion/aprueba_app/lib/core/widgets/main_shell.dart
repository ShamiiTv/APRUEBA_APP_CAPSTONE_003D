import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../features/auth/auth_providers.dart';
import '../l10n/l10n.dart';
import '../theme/wf_colors.dart';
import 'medal_toast.dart';

class MainShell extends ConsumerWidget {
  const MainShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = WfColors.of(context);
    final tabs = [
      ('🏠', tr(context, 'Hoy', 'Today')),
      ('🏅', tr(context, 'Medallas', 'Medals')),
      ('👥', tr(context, 'Grupos', 'Groups')),
      ('🎓', tr(context, 'Tutores', 'Tutors')),
      ('💬', tr(context, 'Red', 'Feed')),
      ('⚙️', tr(context, 'Ajustes', 'Settings')),
    ];

    return Scaffold(
      body: MedalRewardHost(child: navigationShell),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: c.bg,
          border: Border(top: BorderSide(color: c.line, width: 1.5)),
        ),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(4, 8, 4, 10),
            child: Row(
              children: [
                for (var i = 0; i < tabs.length; i++)
                  Expanded(
                    child: InkWell(
                      onTap: () {
                        navigationShell.goBranch(
                          i,
                          initialLocation: i == navigationShell.currentIndex,
                        );
                        // Al cambiar de pestaña, actualizamos cuota y medallas.
                        ref.read(profileProvider.notifier).refresh();
                      },
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            tabs[i].$1,
                            style: const TextStyle(fontSize: 18),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            tabs[i].$2,
                            style: GoogleFonts.montserrat(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: i == navigationShell.currentIndex
                                  ? c.brand
                                  : c.muted,
                            ),
                          ),
                        ],
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
