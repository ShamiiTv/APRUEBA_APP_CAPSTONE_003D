import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:aprueba_app/core/widgets/private_beta_notice.dart';
void main() {
  testWidgets('La beta explica las funciones pendientes', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: PrivateBetaNotice(feature: 'Pagos')));
    expect(find.textContaining('Pagos'), findsWidgets);
  });
}
