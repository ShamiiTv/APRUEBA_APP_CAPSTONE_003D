import 'package:flutter/material.dart';

import '../../core/l10n/l10n.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/theme/app_colors.dart';
import '../../core/utils/tier_names.dart';
import '../../core/widgets/medal_toast.dart';
import '../../core/theme/wf_colors.dart';
import '../../core/widgets/wf_widgets.dart';
import '../auth/auth_providers.dart';
import 'medals_providers.dart';
import 'medals_repository.dart';

class ExchangeScreen extends ConsumerStatefulWidget {
  const ExchangeScreen({super.key});

  @override
  ConsumerState<ExchangeScreen> createState() => _ExchangeScreenState();
}

class _ExchangeScreenState extends ConsumerState<ExchangeScreen> {
  String? _busy;

  // (nivel, nombre, color, siguiente, nombre siguiente)
  static const _tiers = [
    ('bronze', 'Bronce', AppColors.bronze, 'silver', 'Plata'),
    ('silver', 'Plata', AppColors.silver, 'gold', 'Oro'),
    ('gold', 'Oro', AppColors.gold, 'diamond', 'Diamante'),
    ('diamond', 'Diamante', AppColors.diamond, 'platinum', 'Platino'),
    ('platinum', 'Platino', AppColors.platinum, null, null),
  ];

  Future<void> _exchange(
    String from,
    String fromName,
    String toName,
    String toTier,
  ) async {
    setState(() => _busy = from);
    try {
      await ref.read(medalsRepositoryProvider).exchange(from);
      await ref.read(profileProvider.notifier).refresh();
      if (mounted) {
        showMedalToast(context, toTier, 1);
      }
    } on MedalsException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = WfColors.of(context);
    final user = ref.watch(profileProvider).value;

    return Scaffold(
      appBar: AppBar(
        title: Text(tr(context, 'Canje de medallas', 'Medal exchange')),
        leading: BackButton(onPressed: () => context.pop()),
      ),
      body: user == null
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              children: [
                Text(
                  tr(
                    context,
                    '5 medallas de un nivel = 1 del siguiente. Irreversible.',
                    '5 medals of one tier = 1 of the next. Irreversible.',
                  ),
                  style: GoogleFonts.inter(fontSize: 13, color: c.muted),
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    for (var i = 0; i < _tiers.length; i++) ...[
                      MedalCoin(tier: _tiers[i].$1, size: 36),
                      if (i < _tiers.length - 1)
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 4),
                          child: Text(
                            '→',
                            style: TextStyle(color: c.muted, fontSize: 14),
                          ),
                        ),
                    ],
                  ],
                ),
                for (final t in _tiers)
                  _card(context, t, user.medals[t.$1] ?? 0),
              ],
            ),
    );
  }

  Widget _card(
    BuildContext context,
    (String, String, Color, String?, String?) t,
    int have,
  ) {
    final c = WfColors.of(context);
    final next = t.$4;
    final nextName = next == null ? '' : tierName(context, next);
    final ownName = tierName(context, t.$1);
    final can = have >= 5;
    final missing = (5 - have).clamp(0, 5);
    final busy = _busy == t.$1;
    final isPlatinum = next == null;

    return Container(
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: c.soft,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: c.line, width: 1.5),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              MedalCoin(tier: t.$1, size: 40),
              Column(
                children: [
                  Text(
                    isPlatinum
                        ? tr(
                            context,
                            '5 $ownName → 1 Beneficio',
                            '5 $ownName → 1 Benefit',
                          )
                        : '5 $ownName → 1 $nextName',
                    style: GoogleFonts.inter(fontSize: 12, color: c.muted),
                  ),
                  Text(
                    tr(context, 'Tienes: $have', 'You have: $have'),
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: t.$3,
                    ),
                  ),
                ],
              ),
              isPlatinum
                  ? const Text('🎁', style: TextStyle(fontSize: 26))
                  : MedalCoin(tier: next, size: 40),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Text(
                '$have/5',
                style: GoogleFonts.inter(fontSize: 11, color: c.muted),
              ),
              const Spacer(),
              Text(
                can
                    ? tr(context, '¡Listo!', 'Ready!')
                    : tr(context, 'Faltan $missing', '$missing missing'),
                style: GoogleFonts.inter(
                  fontSize: 11,
                  color: can ? const Color(0xFF059669) : c.muted,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          WfBar(value: have / 5, color: t.$3, height: 6),
          const SizedBox(height: 10),
          FilledButton(
            onPressed: isPlatinum
                ? (can ? () => context.push('/medals/benefits') : null)
                : ((!can || _busy != null)
                      ? null
                      : () => _exchange(
                          t.$1,
                          tierName(context, t.$1),
                          tierName(context, next),
                          next,
                        )),
            style: FilledButton.styleFrom(
              backgroundColor: t.$3,
              foregroundColor: t.$1 == 'gold' ? AppColors.azul : Colors.white,
              disabledBackgroundColor: t.$3.withValues(alpha: 0.35),
              disabledForegroundColor: Colors.white.withValues(alpha: 0.9),
              minimumSize: const Size.fromHeight(42),
            ),
            child: busy
                ? const SizedBox(
                    height: 18,
                    width: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : Text(
                    can
                        ? (isPlatinum
                              ? tr(
                                  context,
                                  'Canjear 5 $ownName → 1 Beneficio',
                                  'Exchange 5 $ownName → 1 Benefit',
                                )
                              : tr(
                                  context,
                                  'Canjear 5 $ownName → 1 $nextName',
                                  'Exchange 5 $ownName → 1 $nextName',
                                ))
                        : tr(
                            context,
                            'Faltan $missing $ownName',
                            'Need $missing more',
                          ),
                  ),
          ),
        ],
      ),
    );
  }
}
