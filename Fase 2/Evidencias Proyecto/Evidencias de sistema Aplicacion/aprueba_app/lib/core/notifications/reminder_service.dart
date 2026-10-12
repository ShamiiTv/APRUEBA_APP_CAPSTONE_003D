import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

/// Recordatorio diario del celular. Solo funciona en Android;
/// en Chrome u otras plataformas no hace nada.
class ReminderService {
  ReminderService._();

  static final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();

  static const int _id = 1001;
  static bool _ready = false;
  static String? _lastKey;

  static bool get _supported =>
      !kIsWeb && defaultTargetPlatform == TargetPlatform.android;

  /// Zona horaria del celular (por su diferencia con UTC), para que la hora
  /// elegida sea la que muestra el reloj del teléfono.
  static tz.Location _deviceLocation() {
    final off = DateTime.now().timeZoneOffset;
    if (off.inMinutes % 60 == 0) {
      final h = off.inHours;
      if (h == 0) return tz.UTC;
      // En la base de datos "Etc/GMT+3" significa UTC-3 (signo invertido).
      final name = 'Etc/GMT${h > 0 ? '-' : '+'}${h.abs()}';
      try {
        return tz.getLocation(name);
      } catch (_) {}
    }
    return tz.UTC;
  }

  static Future<void> _init() async {
    if (_ready) return;
    tzdata.initializeTimeZones();
    tz.setLocalLocation(_deviceLocation());
    await _plugin.initialize(
      settings: const InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
      ),
    );
    _ready = true;
  }

  /// Programa (o cancela) el recordatorio según lo que hay en el perfil.
  static Future<void> sync({
    required bool enabled,
    required String time, // HH:mm
    required String locale, // es | en
  }) async {
    if (!_supported) return;

    final key = '$enabled|$time|$locale';
    if (key == _lastKey) return;
    // Si ya había una configuración en esta sesión y el usuario la cambió,
    // mostramos un aviso inmediato de confirmación.
    final changedByUser = _lastKey != null;

    try {
      await _init();

      if (!enabled) {
        await _plugin.cancel(id: _id);
        _lastKey = key;
        return;
      }

      // Android 13+: pide permiso para mostrar notificaciones.
      final android = _plugin
          .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin
          >();
      await android?.requestNotificationsPermission();
      // Android 12+: para que suene justo a la hora, pide alarmas exactas.
      var exact = await android?.canScheduleExactNotifications() ?? false;
      if (!exact) {
        await android?.requestExactAlarmsPermission();
        exact = await android?.canScheduleExactNotifications() ?? false;
      }

      final parts = time.split(':');
      final hour = int.tryParse(parts.first) ?? 20;
      final minute = parts.length > 1 ? int.tryParse(parts[1]) ?? 0 : 0;

      final now = tz.TZDateTime.now(tz.local);
      var when = tz.TZDateTime(
        tz.local,
        now.year,
        now.month,
        now.day,
        hour,
        minute,
      );
      if (!when.isAfter(now)) {
        when = tz.TZDateTime(
          tz.local,
          now.year,
          now.month,
          now.day + 1,
          hour,
          minute,
        );
      }

      final en = locale == 'en';
      await _plugin.zonedSchedule(
        id: _id,
        title: 'Aprueba',
        body: en
            ? "Time to practice for the PAES! Answer today's questions 📚"
            : '¡Es hora de practicar para la PAES! Responde tus preguntas de hoy 📚',
        scheduledDate: when,
        notificationDetails: NotificationDetails(
          android: AndroidNotificationDetails(
            'daily_reminder',
            en ? 'Daily reminder' : 'Recordatorio diario',
            channelDescription: en
                ? 'Daily reminder to practice'
                : 'Recordatorio diario para practicar',
            importance: Importance.high,
            priority: Priority.high,
          ),
        ),
        androidScheduleMode: exact
            ? AndroidScheduleMode.exactAllowWhileIdle
            : AndroidScheduleMode.inexactAllowWhileIdle,
        // Se repite todos los días a la misma hora.
        matchDateTimeComponents: DateTimeComponents.time,
      );
      _lastKey = key;

      if (changedByUser) {
        await _plugin.show(
          id: _id + 1,
          title: 'Aprueba',
          body: en
              ? 'Daily reminder set for $time ✓'
              : 'Recordatorio diario activado a las $time ✓',
          notificationDetails: NotificationDetails(
            android: AndroidNotificationDetails(
              'daily_reminder',
              en ? 'Daily reminder' : 'Recordatorio diario',
              importance: Importance.high,
              priority: Priority.high,
            ),
          ),
        );
      }
    } catch (e) {
      debugPrint('No se pudo programar el recordatorio: $e');
    }
  }

  /// Cancela el recordatorio (al cerrar sesión o eliminar la cuenta).
  static Future<void> cancel() async {
    if (!_supported) return;
    try {
      await _init();
      await _plugin.cancel(id: _id);
      _lastKey = null;
    } catch (e) {
      debugPrint('No se pudo cancelar el recordatorio: $e');
    }
  }
}
