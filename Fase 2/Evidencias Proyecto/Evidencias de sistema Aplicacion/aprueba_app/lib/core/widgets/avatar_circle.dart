import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../theme/app_colors.dart';
import '../theme/wf_colors.dart';
import '../utils/format_utils.dart';

/// Avatar circular con iniciales, como en el wireframe.
class AvatarCircle extends StatelessWidget {
  const AvatarCircle({
    super.key,
    required this.name,
    required this.color,
    this.size = 30,
  });

  final String name;
  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) {
    final c = WfColors.of(context);
    final fg = color.computeLuminance() > 0.55 ? AppColors.azul : Colors.white;

    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
        border: Border.all(color: c.bg, width: 2),
      ),
      child: Text(
        initialsOf(name),
        style: GoogleFonts.montserrat(
          fontSize: size * 0.36,
          fontWeight: FontWeight.w700,
          color: fg,
        ),
      ),
    );
  }
}
