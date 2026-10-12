import 'package:dio/dio.dart';

import '../../core/network/api_client.dart';
import '../../data/plan_models.dart';

class SubscriptionException implements Exception {
  final String message;

  SubscriptionException(this.message);

  @override
  String toString() => message;
}

/// Pagos SIMULADOS: el contrato es el de Stripe (sesión de pago + confirmación), pero
/// la confirmación la hace el endpoint de demostración. Ver LEEME_LOTE3.md.
class SubscriptionRepository {
  SubscriptionException _error(DioException e, String fallback) {
    final body = e.response?.data;
    if (body is Map && body['error'] is Map) {
      final msg = (body['error'] as Map)['message'];
      if (msg is String) return SubscriptionException(msg);
    }
    return SubscriptionException(
      e.response == null ? 'No se pudo conectar con el servidor.' : fallback,
    );
  }

  Map<String, dynamic> _map(dynamic v) => Map<String, dynamic>.from(v as Map);

  Future<List<Plan>> fetchPlans() async {
    try {
      final res = await ApiClient.dio.get('/plans');
      final list = (res.data['data'] as List?) ?? const [];
      final plans = list.map((p) => Plan.fromJson(_map(p))).toList()
        ..sort((a, b) => a.order.compareTo(b.order));
      return plans;
    } on DioException catch (e) {
      throw _error(e, 'No se pudieron cargar los planes.');
    }
  }

  /// Suscripción nueva: crea la sesión de pago (con Idempotency-Key) y la confirma.
  Future<void> checkout(
    String planId,
    String cycle,
    String idempotencyKey,
  ) async {
    try {
      final res = await ApiClient.dio.post(
        '/checkout/sessions',
        data: {'plan': planId, 'billingCycle': cycle},
        options: Options(headers: {'Idempotency-Key': idempotencyKey}),
      );
      final id = _map(res.data['data'])['checkoutSessionId'].toString();
      await ApiClient.dio.post('/checkout/sessions/$id/confirm-simulated');
    } on DioException catch (e) {
      throw _error(e, 'No se pudo completar el pago.');
    }
  }

  /// Cambia de plan o de ciclo sobre la suscripción vigente (también reactiva una cancelada al final del período).
  Future<void> change({String? plan, String? cycle}) async {
    try {
      await ApiClient.dio.post(
        '/me/subscription/change',
        data: {'plan': ?plan, 'billingCycle': ?cycle},
      );
    } on DioException catch (e) {
      throw _error(e, 'No se pudo cambiar el plan.');
    }
  }

  Future<void> cancel({required bool immediate}) async {
    try {
      await ApiClient.dio.post(
        '/me/subscription/cancel',
        data: {'immediate': immediate},
      );
    } on DioException catch (e) {
      throw _error(e, 'No se pudo cancelar la suscripción.');
    }
  }

  Future<SubscriptionInfo> fetchSubscription() async {
    try {
      final res = await ApiClient.dio.get('/me/subscription');
      return SubscriptionInfo.fromJson(_map(res.data['data']));
    } on DioException catch (e) {
      throw _error(e, 'No se pudo cargar tu suscripción.');
    }
  }

  Future<List<Invoice>> fetchInvoices() async {
    try {
      final res = await ApiClient.dio.get('/me/invoices');
      final list = (res.data['data'] as List?) ?? const [];
      return list.map((i) => Invoice.fromJson(_map(i))).toList();
    } on DioException catch (e) {
      throw _error(e, 'No se pudo cargar el historial de pagos.');
    }
  }
}
