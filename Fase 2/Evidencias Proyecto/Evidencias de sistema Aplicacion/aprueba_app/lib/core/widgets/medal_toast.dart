import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../theme/app_colors.dart';
import '../utils/tier_names.dart';
import 'wf_widgets.dart';

typedef MedalReward = ({String tier, int amount, String? reason, int? streak});

/// Medalla ganada que aún no se anunció (la de bienvenida o la del inicio de sesión diario).
/// Se muestra cuando ya se ve la pantalla de inicio.
final ValueNotifier<MedalReward?> pendingMedalReward =
    ValueNotifier<MedalReward?>(null);

/// Banner flotante: "+1 Medalla de Bronce" con el motivo y un botón "Ver".
/// Se queda unos segundos y desaparece solo.
void showMedalToast(
  BuildContext context,
  String tier,
  int amount, {
  String? reason,
  int? streak,
}) {
  if (amount <= 0) return;
  final overlay = Overlay.maybeOf(context, rootOverlay: true);
  if (overlay == null) return;
  late OverlayEntry entry;
  entry = OverlayEntry(
    builder: (ctx) => _MedalToast(
      tier: tier,
      amount: amount,
      reason: reason,
      streak: streak,
      onDone: () => entry.remove(),
    ),
  );
  overlay.insert(entry);
}

class _MedalToast extends StatefulWidget {
  const _MedalToast({
    required this.tier,
    required this.amount,
    required this.onDone,
    this.reason,
    this.streak,
  });

  final String tier;
  final int amount;
  final String? reason;
  final int? streak;
  final VoidCallback onDone;

  @override
  State<_MedalToast> createState() => _MedalToastState();
}

class _MedalToastState extends State<_MedalToast> {
  static const _visibleFor = Duration(milliseconds: 4000);
  static const _fade = Duration(milliseconds: 350);

  bool _show = false;
  bool _disposed = false;
  bool _closed = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_disposed) setState(() => _show = true);
    });
    Future.delayed(_visibleFor + _fade, _close);
  }

  void _close() {
    if (_disposed || _closed) return;
    _closed = true;
    setState(() => _show = false);
    Future.delayed(_fade + const Duration(milliseconds: 50), () {
      if (!_disposed) widget.onDone();
    });
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }

  String get _subtitle {
    final parts = <String>[];
    if (widget.reason != null && widget.reason!.isNotEmpty) {
      parts.add(widget.reason!);
    }
    if (widget.streak != null && widget.streak! > 1) {
      parts.add('¡Día ${widget.streak} seguido!');
    }
    return parts.join(' · ');
  }

  void _openMedals() {
    final router = GoRouter.of(context);
    _close();
    router.push('/medals');
  }

  @override
  Widget build(BuildContext context) {
    final onColor = widget.tier == 'gold' ? AppColors.azul : Colors.white;
    final subtitle = _subtitle;

    return SafeArea(
      child: Align(
        alignment: Alignment.topCenter,
        child: AnimatedSlide(
          duration: _fade,
          curve: Curves.easeOut,
          offset: _show ? Offset.zero : const Offset(0, -0.6),
          child: AnimatedOpacity(
            duration: _fade,
            opacity: _show ? 1 : 0,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 440),
                child: Material(
                  color: Colors.transparent,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 12,
                    ),
                    decoration: BoxDecoration(
                      color: _color(widget.tier),
                      borderRadius: BorderRadius.circular(18),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x40000000),
                          blurRadius: 16,
                          offset: Offset(0, 5),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        MedalCoin(tier: widget.tier, size: 34),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                '+${widget.amount} Medalla de ${tierName(context, widget.tier)}',
                                style: GoogleFonts.montserrat(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w800,
                                  color: onColor,
                                ),
                              ),
                              if (subtitle.isNotEmpty) ...[
                                const SizedBox(height: 2),
                                Text(
                                  subtitle,
                                  style: GoogleFonts.inter(
                                    fontSize: 12,
                                    color: onColor.withValues(alpha: 0.9),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                        const SizedBox(width: 10),
                        InkWell(
                          borderRadius: BorderRadius.circular(14),
                          onTap: _openMedals,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 7,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.25),
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: Text(
                              'Ver',
                              style: GoogleFonts.montserrat(
                                fontSize: 13,
                                fontWeight: FontWeight.w800,
                                color: onColor,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  static Color _color(String tier) => switch (tier) {
    'bronze' => AppColors.bronze,
    'silver' => AppColors.silver,
    'gold' => AppColors.gold,
    'diamond' => AppColors.diamond,
    'platinum' => AppColors.platinum,
    _ => AppColors.azul,
  };
}

/// Envuelve la pantalla principal: muestra el anuncio de la medalla pendiente.
class MedalRewardHost extends StatefulWidget {
  const MedalRewardHost({super.key, required this.child});

  final Widget child;

  @override
  State<MedalRewardHost> createState() => _MedalRewardHostState();
}

class _MedalRewardHostState extends State<MedalRewardHost> {
  @override
  void initState() {
    super.initState();
    pendingMedalReward.addListener(_check);
    WidgetsBinding.instance.addPostFrameCallback((_) => _check());
  }

  @override
  void dispose() {
    pendingMedalReward.removeListener(_check);
    super.dispose();
  }

  void _check() {
    final r = pendingMedalReward.value;
    if (r == null || !mounted) return;
    pendingMedalReward.value = null;
    showMedalToast(context, r.tier, r.amount, reason: r.reason, streak: r.streak);
  }

  @override
  Widget build(BuildContext context) => widget.child;
}