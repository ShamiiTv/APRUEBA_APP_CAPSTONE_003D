import 'package:dio/dio.dart';

import '../../core/storage/pending_operation.dart';
import '../../core/network/api_client.dart';
import '../../data/benefit_models.dart';
import '../../data/social_models.dart';

class MedalsException implements Exception {
  final String message;

  MedalsException(this.message);

  @override
  String toString() => message;
}

class MedalsRepository {
  MedalsException _error(DioException e, String fallback) {
    final body = e.response?.data;
    if (body is Map && body['error'] is Map) {
      final msg = (body['error'] as Map)['message'];
      if (msg is String) return MedalsException(msg);
    }
    return MedalsException(
      e.response == null ? 'No se pudo conectar con el servidor.' : fallback,
    );
  }

  /// Canjea 5 medallas de [fromTier] por 1 del nivel siguiente (POST /me/medals/exchange).
  Future<void> exchange(String fromTier) async {
    try {
      await ApiClient.dio.post(
        '/medals/exchange',
        data: {
          'fromTier': fromTier,
          'requestId': await PendingOperation.id('exchange', fromTier),
        },
      );
      await PendingOperation.complete('exchange');
    } on DioException catch (e) {
      throw _error(e, 'No se pudo realizar el canje.');
    }
  }

  Future<List<Benefit>> fetchBenefits() async {
    try {
      final res = await ApiClient.dio.get('/medals/benefits');
      final list = (res.data['data'] as List?) ?? const [];
      return list
          .map((b) => Benefit.fromJson(Map<String, dynamic>.from(b as Map)))
          .toList();
    } on DioException catch (e) {
      throw _error(e, 'No se pudieron cargar los beneficios.');
    }
  }

  /// Canjea un beneficio con 5 de Platino y devuelve el cupón (POST /benefits/{id}/redeem).
  Future<Redemption> redeem(String benefitId) async {
    try {
      final res = await ApiClient.dio.post('/benefits/$benefitId/redeem');
      return Redemption.fromJson(
        Map<String, dynamic>.from(res.data['data'] as Map),
      );
    } on DioException catch (e) {
      throw _error(e, 'No se pudo canjear el beneficio.');
    }
  }

  Future<GiftsState> fetchGifts() async {
    try {
      final res = await ApiClient.dio.get('/me/gifts');
      return GiftsState.fromJson(
        Map<String, dynamic>.from(res.data['data'] as Map),
      );
    } on DioException catch (e) {
      throw _error(e, 'No se pudieron cargar los regalos.');
    }
  }

  /// Regala bronces: [amounts] es userId -> cantidad (POST /me/gifts).
  Future<void> sendGifts(Map<String, int> amounts) async {
    try {
      await ApiClient.dio.post(
        '/me/gifts',
        data: {
          'recipients': [
            for (final e in amounts.entries)
              if (e.value > 0) {'userId': e.key, 'amount': e.value},
          ],
        },
      );
    } on DioException catch (e) {
      throw _error(e, 'No se pudieron enviar los regalos.');
    }
  }
}
