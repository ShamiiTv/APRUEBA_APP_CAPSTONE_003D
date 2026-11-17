import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TokenStorage {
  static String? _webAccess;
  static int revision = 0;
  static const _sessionKey = 'aprueba_session';
  static const _storage = FlutterSecureStorage();
  static const _accessKey = 'access_token';
  static const _refreshKey = 'refresh_token';

  static Future<void> save(String access, {String? refresh}) async {
    revision++;
    if (kIsWeb) {
      _webAccess = access;
      await _storage.write(key: _sessionKey, value: '1');
      await _storage.delete(key: _accessKey);
      await _storage.delete(key: _refreshKey);
      return;
    }
    await _storage.write(key: _accessKey, value: access);
    if (refresh != null) await _storage.write(key: _refreshKey, value: refresh);
  }

  static Future<String?> read() async =>
      kIsWeb ? _webAccess : await _storage.read(key: _accessKey);
  static Future<bool> hasSession() async => kIsWeb
      ? (await _storage.read(key: _sessionKey) == '1' ||
            await _storage.read(key: _accessKey) != null)
      : (await read())?.isNotEmpty == true;
  static Future<String?> readRefresh() => _storage.read(key: _refreshKey);
  static Future<void> clear() async {
    revision++;
    _webAccess = null;
    String? theme;
    try {
      theme = await _storage.read(key: 'aprueba_theme');
    } catch (_) {
      /* Un fallo de preferencia no impide cerrar sesión. */
    }
    await _storage.deleteAll();
    if (theme != null) {
      try {
        await _storage.write(key: 'aprueba_theme', value: theme);
      } catch (_) {
        /* La sesión ya está eliminada. */
      }
    }
  }
}
