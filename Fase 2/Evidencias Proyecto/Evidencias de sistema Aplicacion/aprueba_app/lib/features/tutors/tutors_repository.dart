import 'package:dio/dio.dart';

import '../../core/storage/pending_operation.dart';

import '../../core/network/api_client.dart';
import '../../core/network/api_error.dart';
import '../../data/social_models.dart';

class TutorsRepository {
  TutorsRepository({this.locale = "es"});
  final String locale;
  Future<List<Tutor>> fetchTutors() async {
    try {
      final res = await ApiClient.dio.get(
        '/tutors',
        queryParameters: {'locale': locale},
      );
      final list = (res.data['data'] as List?) ?? const [];
      return list
          .map((t) => Tutor.fromJson(Map<String, dynamic>.from(t as Map)))
          .toList();
    } on DioException catch (e) {
      throw apiFailureFrom(e, 'No se pudieron cargar los tutores.');
    }
  }

  Future<void> request({
    required String tutorId,
    required String message,
    String? topic,
  }) async {
    try {
      await ApiClient.dio.post(
        '/tutors/request',
        data: {
          'requestId': await PendingOperation.id(
            'tutor',
            '$tutorId|$topic|$message',
          ),
          'tutorId': tutorId,
          'message': message,
          if (topic != null && topic.isNotEmpty) 'topic': topic,
        },
      );
      await PendingOperation.complete('tutor');
    } on DioException catch (e) {
      if (PendingOperation.definitiveRejection(e)) {
        await PendingOperation.complete('tutor');
      }
      throw apiFailureFrom(e, 'No se pudo enviar la solicitud.');
    }
  }
}
