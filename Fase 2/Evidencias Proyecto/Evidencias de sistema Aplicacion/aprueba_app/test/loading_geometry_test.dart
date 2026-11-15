import 'dart:async';
import 'package:aprueba_app/core/widgets/content_skeleton.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:aprueba_app/data/plan_models.dart';
import 'package:aprueba_app/features/subscription/plans_screen.dart';
import 'package:aprueba_app/features/subscription/subscription_providers.dart';

void main() {
  testWidgets('todos los skeletons caben en una pantalla estrecha', (tester) async {
    tester.view.physicalSize=const Size(320,844);tester.view.devicePixelRatio=1;
    addTearDown(tester.view.resetPhysicalSize);addTearDown(tester.view.resetDevicePixelRatio);
    for(final kind in ['plans','groups','medals','home','question','form','levels','tutors','cards']) {
      await tester.pumpWidget(MaterialApp(home:Scaffold(body:ContentSkeleton(kind:kind))));
      await tester.pump();expect(tester.takeException(),isNull,reason:'Sin desbordamiento en $kind');
    }
  });
  for(final width in [320.0,390.0,800.0]) {
    testWidgets('planes conservan alturas entre carga y contenido a $width px', (tester) async {
      tester.view.physicalSize=Size(width,2000);tester.view.devicePixelRatio=1;
      addTearDown(tester.view.resetPhysicalSize);addTearDown(tester.view.resetDevicePixelRatio);
      final response=Completer<List<Plan>>();
      await tester.pumpWidget(ProviderScope(overrides:[plansProvider.overrideWith((ref)=>response.future)],child:MaterialApp(home:const PlansScreen())));
      final before=[for(var i=0;i<3;i++) tester.getSize(find.byType(Card).at(i)).height];
      response.complete([for(final id in ['free','uni','all']) Plan(id:id,name:id,monthly:id=='free'?0:990,yearly:0,color:Colors.blue,popular:false,order:0,features:[])]);
      await tester.pumpAndSettle();
      for(var i=0;i<3;i++){expect(tester.getSize(find.byType(Card).at(i)).height,closeTo(before[i],1),reason:'La tarjeta $i no debe crecer tras el skeleton');}
      expect(tester.takeException(),isNull);
    });
  }
}
