import '../core/utils/format_utils.dart';

class AppNotification {
  final String id;
  final String type;
  final String title;
  final String body;
  final bool read;
  final DateTime? createdAt;

  const AppNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.read,
    required this.createdAt,
  });

  AppNotification asRead() => AppNotification(
    id: id,
    type: type,
    title: title,
    body: body,
    read: true,
    createdAt: createdAt,
  );

  String get emoji => switch (type) {
    'correction_confirmed' => '✅',
    'gift_received' => '🎁',
    'group_joined' => '👥',
    'plan_activated' => '🚀',
    'payment_failed' => '⚠️',
    _ => '🔔',
  };

  factory AppNotification.fromJson(Map<String, dynamic> j) => AppNotification(
    id: j['id'].toString(),
    type: (j['type'] ?? '').toString(),
    title: (j['title'] ?? '').toString(),
    body: (j['body'] ?? '').toString(),
    read: j['read'] == true,
    createdAt: parseApiDate(j['createdAt']),
  );
}
