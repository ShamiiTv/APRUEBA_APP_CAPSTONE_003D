import 'dart:convert';
import 'dart:math';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:dio/dio.dart';

import 'token_storage.dart';

/// A lost response keeps the same operation ID for the next attempt.
class PendingOperation {
  static const _storage = FlutterSecureStorage();
  static Future<String> _key(String operation) async {
    final token = await TokenStorage.read();
    if (token == null) throw StateError('Inicia sesión para continuar.');
    final claims = jsonDecode(
      utf8.decode(base64Url.decode(base64Url.normalize(token.split('.')[1]))),
    ) as Map;
    return 'operation:${claims['sub']}:$operation';
  }

  static Future<String> id(String operation, String signature) async {
    final key = await _key(operation);
    final raw = await _storage.read(key: key);
    if (raw != null) {
      final saved = jsonDecode(raw) as Map;
      if (saved['signature'] != signature) {
        throw DioException(
          requestOptions: RequestOptions(path: operation),
          response: Response(
            requestOptions: RequestOptions(path: operation),
            statusCode: 409,
            data: {
              'error': {
                'message': 'Hay una operación pendiente. Reintenta el envío original antes de cambiarlo.',
              },
            },
          ),
        );
      }
      return saved['id'] as String;
    }
    final random = Random.secure();
    final id = List.generate(
      24,
      (_) => random.nextInt(256).toRadixString(16).padLeft(2, '0'),
    ).join();
    await _storage.write(
      key: key,
      value: jsonEncode({'signature': signature, 'id': id}),
    );
    return id;
  }

  static Future<void> complete(String operation) async =>
      _storage.delete(key: await _key(operation));
}
