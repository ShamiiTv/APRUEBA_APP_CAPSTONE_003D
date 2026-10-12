import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/notification_models.dart';
import 'notifications_repository.dart';

final notificationsRepositoryProvider = Provider<NotificationsRepository>(
  (ref) => NotificationsRepository(),
);

final notificationsProvider =
    FutureProvider.autoDispose<({List<AppNotification> items, int unread})>(
      (ref) => ref.read(notificationsRepositoryProvider).fetch(),
    );
