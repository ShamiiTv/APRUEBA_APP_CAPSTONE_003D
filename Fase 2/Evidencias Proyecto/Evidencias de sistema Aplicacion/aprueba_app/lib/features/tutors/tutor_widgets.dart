import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/wf_colors.dart';

class TutorStars extends StatelessWidget {
  const TutorStars({super.key, required this.rating, this.size = 12});

  final double rating;
  final double size;

  @override
  Widget build(BuildContext context) {
    final c = WfColors.of(context);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var i = 1; i <= 5; i++)
          Text(
            '★',
            style: TextStyle(
              fontSize: size,
              height: 1,
              color: i <= rating.round() ? AppColors.oro : c.line,
            ),
          ),
      ],
    );
  }
}
