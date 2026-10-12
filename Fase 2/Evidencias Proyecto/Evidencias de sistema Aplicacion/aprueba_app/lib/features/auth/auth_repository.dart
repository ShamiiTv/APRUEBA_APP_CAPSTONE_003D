import 'package:dio/dio.dart';

import '../../core/widgets/medal_toast.dart';
import '../../core/network/api_client.dart';
import '../../core/notifications/reminder_service.dart';
import '../../core/storage/token_storage.dart';
import '../../data/user_profile.dart';

/// Error con un mensaje listo para mostrarle al usuario.
class ApiException implements Exception {
  final String message;
  final String? code;
  final String? field;
  ApiException(this.message, {this.code, this.field});

  @override
  String toString() => message;
}

class AuthRepository {
  ApiException _error(DioException e, String fallback) {
    final data = e.response?.data;
    if (data is Map && data['error'] is Map) {
      final err = data['error'] as Map;
      final msg = err['message'];
      return ApiException(
        msg is String ? msg : fallback,
        code: err['code']?.toString(),
        field: err['field']?.toString(),
      );
    }
    return ApiException('No se pudo conectar con el servidor.');
  }

  /// Guarda los tokens, vengan planos (accessToken/refreshToken) o dentro de `tokens`.
  Future<void> _saveTokens(Map data) async {
    final t = (data['tokens'] is Map) ? data['tokens'] as Map : data;
    await TokenStorage.save(
      t['accessToken'] as String,
      refresh: t['refreshToken'] as String?,
    );
  }

  Future<void> login(String email, String password) async {
    try {
      final res = await ApiClient.dio.post(
        '/auth/login',
        data: {'email': email.trim(), 'password': password},
      );
      final data = res.data['data'] as Map;
      await _saveTokens(data);
      final r = data['dailyLoginReward'];
      if (r is Map) {
        // Se anuncia en pantalla cuando ya se ve el inicio (ver MedalRewardHost).
        pendingMedalReward.value = (
          tier: (r['tier'] ?? 'bronze').toString(),
          amount: (r['amount'] as num?)?.toInt() ?? 1,
        );
      }
    } on DioException catch (e) {
      throw _error(e, 'No se pudo conectar con el servidor.');
    }
  }

  Future<void> register(
    String name,
    String email,
    String password, {
    required bool consent,
    String locale = 'es',
  }) async {
    try {
      final res = await ApiClient.dio.post(
        '/auth/register',
        data: {
          'name': name.trim(),
          'email': email.trim(),
          'password': password,
        },
      );
      await _saveTokens(res.data['data'] as Map);
      // Registration does not award medals in the shared API.
    } on DioException catch (e) {
      throw _error(e, 'No se pudo conectar con el servidor.');
    }
  }

  /// Pide el correo de recuperación. Siempre responde bien (no revela si el correo existe).
  Future<void> forgotPassword(String email) async {
    try {
      await ApiClient.dio.post(
        '/auth/forgot-password',
        data: {'email': email.trim()},
      );
    } on DioException catch (e) {
      throw _error(e, 'No se pudo enviar la solicitud.');
    }
  }

  Future<void> resetPassword(String token, String password) async {
    try {
      await ApiClient.dio.post(
        '/auth/reset-password',
        data: {'oobCode': token.trim(), 'password': password},
      );
    } on DioException catch (e) {
      throw _error(e, 'No se pudo cambiar la contraseña.');
    }
  }

  Future<UserProfile> fetchProfile() async {
    try {
      final response = await ApiClient.dio.get('/auth/me');
      return UserProfile.fromJson(
        Map<String, dynamic>.from(response.data['data']),
      );
    } on DioException catch (e) {
      throw _error(e, 'No se pudo cargar el perfil.');
    }
  }

  static const _settingsKeys = {
    'locale',
    'theme',
    'dailyReminder',
    'reminderTime',
  };

  /// Guarda en la base de datos los campos que se envíen. Los ajustes
  /// (idioma, tema, recordatorio) van a PATCH /me/settings y el resto a PATCH /me.
  Future<void> updateProfile(Map<String, dynamic> data) async {
    final settings = <String, dynamic>{
      for (final e in data.entries)
        if (_settingsKeys.contains(e.key)) e.key: e.value,
    };
    final profile = <String, dynamic>{
      for (final e in data.entries)
        if (!_settingsKeys.contains(e.key)) e.key: e.value,
    };
    try {
      if (settings.isNotEmpty) {
        await ApiClient.dio.patch('/auth/me', data: settings);
      }
      if (profile.isNotEmpty) {
        await ApiClient.dio.patch('/auth/me', data: profile);
      }
    } on DioException catch (e) {
      throw _error(e, 'No se pudieron guardar los cambios.');
    }
  }

  Future<void> changePassword(String current, String next) async {
    try {
      await ApiClient.dio.post(
        '/auth/password',
        data: {'currentPassword': current, 'newPassword': next},
      );
    } on DioException catch (e) {
      throw _error(e, 'No se pudo cambiar la contraseña.');
    }
  }

  Future<void> deleteAccount(String password) async {
    try {
      await ApiClient.dio.delete('/me', data: {'password': password});
    } on DioException catch (e) {
      throw _error(e, 'No se pudo eliminar la cuenta.');
    }
  }

  Future<bool> hasSession() async {
    final token = await TokenStorage.read();
    return token != null && token.isNotEmpty;
  }

  /// Borra la sesión de este dispositivo.
  Future<void> logout() async {
    await ReminderService.cancel();
    await TokenStorage.clear();
  }
}
