import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class LocaleNotifier extends Notifier<Locale> {
  @override
  Locale build() => const Locale('es');

  void setCode(String code) => state = Locale(code == 'en' ? 'en' : 'es');
}

final localeProvider = NotifierProvider<LocaleNotifier, Locale>(
  LocaleNotifier.new,
);

bool isEnglish(BuildContext context) =>
    Localizations.localeOf(context).languageCode == 'en';

/// Devuelve el texto en el idioma activo de la app.
String tr(BuildContext context, String es, String en) =>
    isEnglish(context) ? en : es;
