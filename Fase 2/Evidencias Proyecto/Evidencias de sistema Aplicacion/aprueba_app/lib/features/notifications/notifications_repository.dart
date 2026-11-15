import 'package:dio/dio.dart';

import '../../core/network/api_client.dart';
import '../../core/network/api_error.dart';
import '../../data/notification_models.dart';

class NotificationsRepository {
  Future<({List<AppNotification> items, int unread})> fetch() async {
    try {
      final res = await ApiClient.dio.get('/me/notifications');
      final data = Map<String, dynamic>.from(res.data['data'] as Map);
      final items = (data['items'] as List)
          .map((e) =>
              AppNotification.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
      final unread =
          (data['unread'] as num?)?.toInt() ?? items.where((n) => !n.read).length;
      return (items: items, unread: unread);
    } on DioException catch (e) {
      throw apiFailureFrom(e, 'No se pudieron cargar las notificaciones.');
    }
  }

  Future<void> markRead(String id) async {
    try {
      await ApiClient.dio.patch('/me/notifications/$id/read');
    } on DioException catch (e) {
      throw apiFailureFrom(e, 'No se pudo marcar como leída.');
    }
  }
}