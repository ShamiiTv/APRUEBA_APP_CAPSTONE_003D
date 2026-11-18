import 'package:flutter/foundation.dart';

import 'browser_credentials.dart';

import 'package:dio/dio.dart';

import '../storage/token_storage.dart';

class ApiClient {
  ApiClient._();
  static String languageCode = 'es';

  /// Rutas que no llevan token.
  static const _publicPaths = [
    '/auth/login',
    '/auth/register',
    '/auth/social',
    '/auth/refresh',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/logout',
  ];

  /// Códigos de error (documento de API) que significan "tu sesión no sirve".
  /// Otros 401 (p. ej. AUTH_INVALID_CREDENTIALS al confirmar la contraseña
  /// para borrar la cuenta) NO deben cerrar la sesión.
  static const _sessionCodes = ['AUTH_REQUIRED', 'AUTH_TOKEN_EXPIRED'];

  static void Function()? onUnauthorized;

  static const _envUrl = String.fromEnvironment('API_URL');

  static String get _baseUrl {
    if (_envUrl.isNotEmpty) return _envUrl;
    return 'https://aprueba.shamiiplay.com/api/v1';
  }

  static String? _codeOf(DioException error) {
    final data = error.response?.data;
    final err = data is Map ? data['error'] : null;
    return err is Map ? err['code']?.toString() : null;
  }

  static bool _isSessionError(DioException error) {
    final status = error.response?.statusCode;
    if (status == 401) {
      final code = _codeOf(error);
      return code == null || _sessionCodes.contains(code);
    }
    // A quota or group permission error never invalidates the session.
    return false;
  }

  /// Dio "limpio" (sin interceptores). Sirve para pedir el refresh
  /// y para reintentar la petición que falló.
  static final Dio _bare = _buildBare();
  static Dio _buildBare() {
    final client = Dio(
      BaseOptions(
        baseUrl: _baseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 60),
        headers: kIsWeb ? {'X-Aprueba-Client': 'mobile-browser'} : null,
      ),
    );
    configureBrowserCredentials(client);
    return client;
  }

  /// Renueva con cookie HttpOnly en web y almacenamiento seguro en Android.
  static Future<bool> _refresh() async {
    final refresh = await TokenStorage.readRefresh();
    final revision = TokenStorage.revision;
    if (!kIsWeb && (refresh == null || refresh.isEmpty)) return false;
    if (kIsWeb && !await TokenStorage.hasSession()) return false;
    try {
      final res = await _bare.post(
        '/auth/refresh',
        data: {'refreshToken': ?refresh},
      );
      final d = res.data['data'];
      final t = (d['tokens'] ?? d) as Map;
      if (TokenStorage.revision != revision) return false;
      await TokenStorage.save(
        t['accessToken'] as String,
        refresh: t['refreshToken'] as String?,
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  static final Dio dio = _build();

  static Dio _build() {
    final client = Dio(
      BaseOptions(
        baseUrl: _baseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 60),
      ),
    );

    configureBrowserCredentials(client);
    if (kIsWeb) client.options.headers['X-Aprueba-Client'] = 'mobile-browser';
    client.interceptors.add(
      QueuedInterceptorsWrapper(
        onRequest: (options, handler) async {
          if (_publicPaths.contains(options.path)) {
            return handler.next(options);
          }
          if (kIsWeb &&
              await TokenStorage.hasSession() &&
              await TokenStorage.read() == null) {
            await _refresh();
          }
          final token = await TokenStorage.read();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
            options.extra['hadToken'] = true;
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          final req = error.requestOptions;

          // Errores que no tienen que ver con la sesión: se devuelven tal cual.
          if (req.extra['hadToken'] != true || !_isSessionError(error)) {
            return handler.next(error);
          }

          // ¿Otra petición ya renovó el token mientras esta esperaba?
          final current = await TokenStorage.read();
          final alreadyRenewed =
              current != null &&
              req.headers['Authorization'] != 'Bearer $current';

          final canRetry = req.extra['retried'] != true;
          final renewed =
              alreadyRenewed ||
              (canRetry &&
                  error.response?.statusCode == 401 &&
                  await _refresh());

          if (canRetry && renewed) {
            req.extra['retried'] = true;
            req.headers['Authorization'] =
                'Bearer ${await TokenStorage.read()}';
            try {
              return handler.resolve(await _bare.fetch(req));
            } on DioException catch (e) {
              return handler.next(e);
            }
          }

          // No se pudo renovar: sesión realmente vencida.
          await TokenStorage.clear();
          onUnauthorized?.call();
          handler.next(error);
        },
      ),
    );

    return client;
  }
}
