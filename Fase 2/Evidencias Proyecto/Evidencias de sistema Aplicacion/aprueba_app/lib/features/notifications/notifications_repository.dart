import 'package:dio/dio.dart';

import '../../core/network/api_client.dart';
import '../../core/network/api_error.dart';
import '../../data/notification_models.dart';

class NotificationsRepository {
  Future<({List<AppNotification> items, int unread})> fetch() async {
    throw ApiFailure(
      'Las notificaciones todavía no están disponibles en esta prueba.',
    );
  }

  Future<void> markRead(String id) async {
    try {
      await ApiClient.dio.patch('/me/notifications/$id/read');
    } on DioException catch (e) {
      throw apiFailureFrom(e, 'No se pudo marcar como leída.');
    }
  }
}
