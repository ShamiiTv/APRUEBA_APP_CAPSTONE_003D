import '../l10n/system_text.dart';
import 'api_client.dart';

import 'package:dio/dio.dart';

class ApiFailure implements Exception {
  final String message;

  ApiFailure(String value)
    : message = translateSystemText(ApiClient.languageCode, value);

  @override
  String toString() => message;
}

ApiFailure apiFailureFrom(DioException e, String fallback) {
  final body = e.response?.data;
  if (body is Map && body['error'] is Map) {
    final msg = (body['error'] as Map)['message'];
    if (msg is String && msg.isNotEmpty) return ApiFailure(msg);
  }
  return ApiFailure(
    e.response == null ? 'No se pudo conectar con el servidor.' : fallback,
  );
}
