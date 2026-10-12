import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../theme/app_colors.dart';
import '../utils/tier_names.dart';
import 'wf_widgets.dart';

/// Medalla ganada que aún no se anunció (p. ej. la del inicio de sesión diario, que llega en
/// la respuesta del login y se muestra cuando ya se ve la pantalla de inicio).
final ValueNotifier<({String tier, int amount})?> pendingMedalReward =
    ValueNotifier<({String tier, int amount})?>(null);

/// Mini anuncio flotante: "+1 🥉 Bronce". Se muestra ~2 segundos y desaparece solo.
void showMedalToast(BuildContext context, String tier, int amount) {
  if (amount <= 0) return;
  final overlay = Overlay.maybeOf(context, rootOverlay: true);
  if (overlay == null) return;
  late OverlayEntry entry;
  entry = OverlayEntry(
    builder: (ctx) =>
        _MedalToast(tier: tier, amount: amount, onDone: () => entry.remove()),
  );
  overlay.insert(entry);
}

class _MedalToast extends StatefulWidget {
  const _MedalToast({
    required this.tier,
    required this.amount,
    required this.onDone,
  });

  final String tier;
  final int amount;
  final VoidCallback onDone;

  @override
  State<_MedalToast> createState() => _MedalToastState();
}

class _MedalToastState extends State<_MedalToast> {
  /// Tiempo que el aviso se queda visible (sin contar la entrada y la salida).
  static const _visibleFor = Duration(milliseconds: 2000);
  static const _fade = Duration(milliseconds: 350);

  bool _show = false;
  bool _disposed = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_disposed) setState(() => _show = true);
    });
    Future.delayed(_visibleFor + _fade, () {
      if (_disposed) return;
      setState(() => _show = false);
      Future.delayed(_fade + const Duration(milliseconds: 50), () {
        if (!_disposed) widget.onDone();
      });
    });
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: SafeArea(
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
                padding: const EdgeInsets.only(top: 14),
                child: Material(
                  color: Colors.transparent,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 9,
                    ),
                    decoration: BoxDecoration(
                      color: _color(widget.tier),
                      borderRadius: BorderRadius.circular(30),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x40000000),
                          blurRadius: 16,
                          offset: Offset(0, 5),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        MedalCoin(tier: widget.tier, size: 26),
                        const SizedBox(width: 10),
                        Text(
                          '+${widget.amount} ${tierName(context, widget.tier)}',
                          style: GoogleFonts.montserrat(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: widget.tier == 'gold'
                                ? AppColors.azul
                                : Colors.white,
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

/// Envuelve la pantalla principal: muestra el anuncio de la medalla pendiente (la de login).
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
    showMedalToast(context, r.tier, r.amount);
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
