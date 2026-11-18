import 'package:flutter/material.dart';

/// Shared by real cards and placeholders; minimums never clip longer content.
class LoadingGeometry {
  static double planHeight(BuildContext context, String id) {
    final base = id == 'uni'
        ? 430.0
        : id == 'free'
        ? 350.0
        : 390.0;
    final scale = MediaQuery.textScalerOf(context).scale(14) / 14;
    final narrow = MediaQuery.sizeOf(context).width < 360 ? 1.15 : 1.0;
    return base * scale.clamp(1.0, 3.0) * narrow;
  }
}

