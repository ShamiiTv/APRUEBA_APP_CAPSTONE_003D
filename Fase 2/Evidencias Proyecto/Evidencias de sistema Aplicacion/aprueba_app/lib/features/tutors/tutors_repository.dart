import 'package:dio/dio.dart';

import '../../core/network/api_client.dart';
import '../../core/network/api_error.dart';
import '../../data/social_models.dart';

class TutorsRepository {
  Future<List<Tutor>> fetchTutors() async {
    try {
      final res = await ApiClient.dio.get('/tutors');
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
          'tutorId': tutorId,
          'message': message,
          if (topic != null && topic.isNotEmpty) 'topic': topic,
        },
      );
    } on DioException catch (e) {
      throw apiFailureFrom(e, 'No se pudo enviar la solicitud.');
    }
  }
}
