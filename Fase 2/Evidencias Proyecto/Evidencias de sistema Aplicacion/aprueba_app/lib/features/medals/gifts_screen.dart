import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/l10n/l10n.dart';
import '../../core/theme/wf_colors.dart';
import '../../core/widgets/wf_widgets.dart';
import '../../data/social_models.dart';
import '../auth/auth_providers.dart';
import 'medals_providers.dart';
import 'medals_repository.dart';

/// Regalar medallas de bronce a compañeros de grupo (máximo 10 por día).
class GiftsScreen extends ConsumerStatefulWidget {
  const GiftsScreen({super.key});

  @override
  ConsumerState<GiftsScreen> createState() => _GiftsScreenState();
}

class _GiftsScreenState extends ConsumerState<GiftsScreen> {
  final Map<String, int> _amounts = {};
  bool _sending = false;

  int get _total => _amounts.values.fold(0, (a, b) => a + b);

  void _change(String userId, int delta, GiftsState st) {
    final cur = _amounts[userId] ?? 0;
    final next = cur + delta;
    if (next < 0) return;
    if (delta > 0 && (_total >= st.remaining || _total >= st.bronzeAvailable)) {
      return;
    }
    setState(() => _amounts[userId] = next);
  }

  Future<void> _send() async {
    setState(() => _sending = true);
    try {
      final n = _total;
      await ref.read(medalsRepositoryProvider).sendGifts(_amounts);
      await ref.read(profileProvider.notifier).refresh();
      ref.invalidate(giftsProvider);
      if (!mounted) return;
      setState(_amounts.clear);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            tr(
              context,
              '¡Regalo enviado! ($n bronce${n == 1 ? '' : 's'})',
              'Gift sent! ($n bronze)',
            ),
          ),
        ),
      );
    } on MedalsException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = WfColors.of(context);
    final gifts = ref.watch(giftsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(tr(context, 'Regalar medallas', 'Gift medals')),
        leading: BackButton(onPressed: () => context.pop()),
      ),
      body: gifts.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  e is MedalsException
                      ? e.message
                      : tr(
                          context,
                          'No se pudieron cargar los regalos.',
                          'Could not load gifts.',
                        ),
                  textAlign: TextAlign.center,
                  style: TextStyle(color: c.danger),
                ),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: () => ref.invalidate(giftsProvider),
                  child: Text(tr(context, 'Reintentar', 'Retry')),
                ),
              ],
            ),
          ),
        ),
        data: (st) => ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          children: [
            Text(
              tr(
                context,
                'Regala medallas de bronce a tus compañeros de grupo. Máximo ${st.max} por día.',
                'Gift bronze medals to your group mates. Up to ${st.max} per day.',
              ),
              style: GoogleFonts.inter(fontSize: 13, color: c.muted),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: c.line, width: 1.5),
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      const MedalCoin(tier: 'bronze', size: 36),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          tr(
                            context,
                            'Bronces disponibles',
                            'Bronze available',
                          ),
                          style: GoogleFonts.inter(fontSize: 13),
                        ),
                      ),
                      Text(
                        '${st.bronzeAvailable}',
                        style: GoogleFonts.montserrat(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Text(
                        tr(context, 'Regalos de hoy', "Today's gifts"),
                        style: GoogleFonts.inter(fontSize: 11, color: c.muted),
                      ),
                      const Spacer(),
                      Text(
                        '${st.used}/${st.max}',
                        style: GoogleFonts.inter(fontSize: 11, color: c.muted),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  WfBar(
                    value: st.max == 0 ? 0 : st.used / st.max,
                    color: c.brand,
                    height: 6,
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(top: 16, bottom: 4),
              child: Text(
                tr(context, 'COMPAÑEROS DE GRUPO', 'GROUP MATES'),
                style: GoogleFonts.montserrat(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.8,
                  color: c.muted,
                ),
              ),
            ),
            if (st.friends.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 24),
                child: Text(
                  tr(
                    context,
                    'Aún no compartes grupos con nadie. Crea un grupo e invita a tus compañeros para poder regalarles medallas.',
                    "You don't share a group with anyone yet. Create a group and invite classmates to gift them medals.",
                  ),
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(fontSize: 13, color: c.muted),
                ),
              ),
            for (final f in st.friends) _friendRow(context, f, st),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: (_total == 0 || _sending) ? null : _send,
              child: _sending
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Text(
                      tr(
                        context,
                        'Enviar $_total regalo(s)',
                        'Send $_total gift(s)',
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _friendRow(BuildContext context, GiftFriend f, GiftsState st) {
    final c = WfColors.of(context);
    final n = _amounts[f.userId] ?? 0;
    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: c.line, width: 1.5),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  f.name,
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (f.giftedToday > 0)
                  Text(
                    tr(
                      context,
                      'Hoy le regalaste ${f.giftedToday}',
                      'Gifted today: ${f.giftedToday}',
                    ),
                    style: GoogleFonts.inter(fontSize: 11, color: c.muted),
                  ),
              ],
            ),
          ),
          IconButton(
            onPressed: n == 0 ? null : () => _change(f.userId, -1, st),
            icon: const Icon(Icons.remove_circle_outline),
          ),
          SizedBox(
            width: 24,
            child: Text(
              '$n',
              textAlign: TextAlign.center,
              style: GoogleFonts.montserrat(
                fontSize: 15,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          IconButton(
            onPressed: () => _change(f.userId, 1, st),
            icon: const Icon(Icons.add_circle_outline),
          ),
        ],
      ),
    );
  }
}
