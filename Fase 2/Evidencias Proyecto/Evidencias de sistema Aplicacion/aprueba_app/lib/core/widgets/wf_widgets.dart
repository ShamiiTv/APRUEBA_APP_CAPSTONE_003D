import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../theme/app_colors.dart';
import '../theme/wf_colors.dart';

/// Barra de progreso del wireframe (redondeada).
class WfBar extends StatelessWidget {
  const WfBar({super.key, required this.value, this.color, this.height = 8});

  final double value;
  final Color? color;
  final double height;

  @override
  Widget build(BuildContext context) {
    final c = WfColors.of(context);
    final v = value.clamp(0.0, 1.0).toDouble();

    return Container(
      height: height,
      decoration: BoxDecoration(
        color: c.line,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Align(
        alignment: Alignment.centerLeft,
        child: FractionallySizedBox(
          widthFactor: v,
          child: Container(
            decoration: BoxDecoration(
              color: color ?? c.brand,
              borderRadius: BorderRadius.circular(6),
            ),
          ),
        ),
      ),
    );
  }
}

/// Etiqueta pequeña (tag) del wireframe.
class WfTag extends StatelessWidget {
  const WfTag({super.key, required this.text, this.bg, this.fg});

  final String text;
  final Color? bg;
  final Color? fg;

  @override
  Widget build(BuildContext context) {
    final c = WfColors.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg ?? c.chip,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        text,
        style: GoogleFonts.inter(
          fontSize: 10,
          fontWeight: FontWeight.w700,
          color: fg ?? c.muted,
        ),
      ),
    );
  }
}

/// Moneda de medalla como en el wireframe.
class MedalCoin extends StatelessWidget {
  const MedalCoin({super.key, required this.tier, this.size = 28});

  final String tier;
  final double size;

  static const _emoji = {
    'bronze': '🥉',
    'silver': '🥈',
    'gold': '🥇',
    'diamond': '💎',
    'platinum': '⬡',
  };

  static const _color = {
    'bronze': AppColors.bronze,
    'silver': AppColors.silver,
    'gold': AppColors.gold,
    'diamond': AppColors.diamond,
    'platinum': AppColors.platinum,
  };

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: _color[tier] ?? AppColors.bronze,
        shape: BoxShape.circle,
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.5),
          width: 2,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.15),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Text(
        _emoji[tier] ?? '🏅',
        style: TextStyle(
          fontSize: size * 0.46,
          color: tier == 'gold' ? AppColors.azul : Colors.white,
        ),
      ),
    );
  }
}

/// Logo oficial (assets/images/logo.png). Si el archivo falta, muestra el nombre.
class WfLogo extends StatelessWidget {
  const WfLogo({super.key, this.height = 140});

  final double height;

  @override
  Widget build(BuildContext context) {
    final c = WfColors.of(context);

    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: Image.asset(
        'assets/images/logo.png',
        height: height,
        fit: BoxFit.contain,
        errorBuilder: (context, error, stack) => SizedBox(
          height: height,
          child: Center(
            child: Text(
              'Aprueba',
              style: GoogleFonts.montserrat(
                fontSize: 32,
                fontWeight: FontWeight.w800,
                color: c.brand,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Pantalla provisoria para los módulos que aún no están armados.
class ComingSoonScreen extends StatelessWidget {
  const ComingSoonScreen({super.key, required this.title, required this.emoji});

  final String title;
  final String emoji;

  @override
  Widget build(BuildContext context) {
    final c = WfColors.of(context);

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(emoji, style: const TextStyle(fontSize: 40)),
              const SizedBox(height: 12),
              Text(title, style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 4),
              Text(
                'Próximamente',
                style: GoogleFonts.inter(fontSize: 13, color: c.muted),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
