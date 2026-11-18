import 'package:aprueba_app/core/theme/app_theme.dart';
import 'package:aprueba_app/core/theme/wf_colors.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  test('custom surfaces interpolate along with the Material theme', () {
    GoogleFonts.config.allowRuntimeFetching = false;
    final halfway = ThemeData.lerp(
      AppTheme.light(),
      AppTheme.dark(),
      .5,
    ).extension<WfColors>()!;
    expect(halfway.bg, Color.lerp(WfColors.light.bg, WfColors.dark.bg, .5));
    expect(halfway.ink, Color.lerp(WfColors.light.ink, WfColors.dark.ink, .5));
    expect(halfway.bg, isNot(WfColors.light.bg));
    expect(halfway.bg, isNot(WfColors.dark.bg));
  });
}
