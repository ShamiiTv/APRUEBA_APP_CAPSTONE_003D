import 'package:flutter/material.dart';

import '../theme/wf_colors.dart';
import 'loading_geometry.dart';

class ContentSkeleton extends StatelessWidget {
  const ContentSkeleton({super.key, this.kind = 'cards', this.inline = false});
  final String kind;
  final bool inline;
  @override
  Widget build(BuildContext context) {
    final c = WfColors.of(context);
    final en = Localizations.localeOf(context).languageCode == 'en';
    Widget bar(double height, {double? width}) => Container(
      height: height,
      width: width,
      decoration: BoxDecoration(
        color: c.soft,
        borderRadius: BorderRadius.circular(8),
      ),
    );
    Widget tile(double height, {bool price = false}) => Container(
      height: height,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: c.bg,
        border: Border.all(color: c.line),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          bar(20, width: 150),
          const SizedBox(height: 12),
          if (price) ...[bar(32, width: 180), const SizedBox(height: 14)],
          bar(14),
          if (height >= 130) ...[const Spacer(), bar(38)],
        ],
      ),
    );
    final items = <Widget>[];
    void gap([double height = 12]) => items.add(SizedBox(height: height));
    if (kind == 'plans') {
      items.add(
        Text(
          en
              ? 'PAYMENT DEMO · No charge or real receipts.'
              : 'DEMOSTRACIÓN DE PAGOS · Sin cobros ni boletas reales.',
        ),
      );
      for (final id in ['free', 'uni', 'all']) {
        items.add(
          Card(
            child: SizedBox(
              height: LoadingGeometry.planHeight(context, id),
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    bar(28, width: 180),
                    const SizedBox(height: 16),
                    bar(28, width: 170),
                    const SizedBox(height: 16),
                    bar(40),
                    if (id == 'uni') ...[const SizedBox(height: 10), bar(48)],
                    const Spacer(),
                    bar(40),
                  ],
                ),
              ),
            ),
          ),
        );
      }
      gap();
      items.add(bar(40));
    } else if (kind == 'groups') {
      if (!inline) {
        items.add(bar(40));
        gap(10);
        items.add(bar(40));
        gap(24);
        items.add(bar(22, width: 150));
      }
      for (var i = 0; i < 2; i++) {
        gap(4);
        items.add(tile(88));
      }
      if (!inline) {
        gap(24);
        items.add(bar(22, width: 200));
        for (var i = 0; i < 2; i++) {
          gap(4);
          items.add(tile(88));
        }
      }
    } else if (kind == 'medals') {
      items.add(bar(28, width: 200));
      gap(8);
      items.add(bar(16));
      gap(12);
      for (var i = 0; i < 5; i++) {
        items.add(tile(92));
        gap(8);
      }
      gap();
      items.add(bar(44));
      gap();
      items.add(bar(44));
    } else if (kind == 'home') {
      items.add(bar(32, width: 210));
      gap(12);
      items.add(tile(120));
      gap();
      items.add(tile(168));
      gap();
      items.add(tile(80));
      gap();
      items.add(bar(48));
      gap(20);
      items.add(bar(24, width: 190));
      gap();
      for (var i = 0; i < 3; i++) {
        items.add(
          Row(
            children: [
              Expanded(child: tile(100)),
              const SizedBox(width: 12),
              Expanded(child: tile(100)),
            ],
          ),
        );
        gap(12);
      }
    } else if (kind == 'question') {
      items.add(bar(26, width: 180));
      gap(14);
      items.add(bar(28));
      gap(14);
      items.add(bar(32, width: 200));
      gap(24);
      items.add(bar(120));
      gap(24);
      for (var i = 0; i < 5; i++) {
        items.add(bar(60));
        gap(12);
      }
      gap();
      items.add(bar(44));
    } else if (kind == 'form') {
      items.add(bar(28, width: 200));
      gap(20);
      for (var i = 0; i < 6; i++) {
        items.add(bar(14, width: 140));
        gap(8);
        items.add(bar(50));
        gap(20);
      }
      items.add(bar(44));
    } else {
      final levels = kind == 'levels';
      if (!inline) {
        items.add(bar(24, width: 190));
        gap(16);
      }
      for (var i = 0; i < (levels ? 3 : 2); i++) {
        items.add(
          tile(
            levels
                ? 110
                : kind == 'tutors'
                ? 120
                : 220,
          ),
        );
        gap(12);
      }
    }
    final content = ExcludeSemantics(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: items,
      ),
    );
    final padding = kind == 'plans' || kind == 'form'
        ? const EdgeInsets.all(20)
        : const EdgeInsets.fromLTRB(16, 12, 16, 20);
    return Semantics(
      label: en ? 'Loading content' : 'Cargando contenido',
      liveRegion: true,
      child: inline
          ? content
          : SingleChildScrollView(padding: padding, child: content),
    );
  }
}

