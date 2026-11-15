import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TokenStorage {
  static const _storage = FlutterSecureStorage();
  static const _accessKey = 'access_token';
  static const _refreshKey = 'refresh_token';

  static Future<void> save(String access, {String? refresh}) async {
    await _storage.write(key: _accessKey, value: access);
    if (refresh != null) await _storage.write(key: _refreshKey, value: refresh);
  }

  static Future<String?> read() => _storage.read(key: _accessKey);
  static Future<String?> readRefresh() => _storage.read(key: _refreshKey);
  static Future<void> clear() async {
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
