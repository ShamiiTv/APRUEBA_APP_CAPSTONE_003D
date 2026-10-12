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
  static Future<void> clear() => _storage.deleteAll();
}
