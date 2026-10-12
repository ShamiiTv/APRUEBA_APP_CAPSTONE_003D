import 'package:dio/dio.dart';

import '../../core/storage/pending_operation.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_error.dart';
import '../../data/shared_models.dart';
import '../../data/social_models.dart';

class GroupsRepository {
  Future<Map<String, dynamic>> details(String id) async {
    final response = await ApiClient.dio.get('/groups/$id');
    return _map(response.data['data']);
  }

  Future<List<Post>> groupPosts(String id) async {
    final response = await ApiClient.dio.get(
      '/posts',
      queryParameters: {'groupId': id},
    );
    return _list(response.data['data'], Post.fromJson);
  }

  Map<String, dynamic> _map(dynamic v) => Map<String, dynamic>.from(v as Map);

  List<T> _list<T>(dynamic v, T Function(Map<String, dynamic>) f) =>
      ((v as List?) ?? const []).map((e) => f(_map(e))).toList();

  Future<List<StudyGroup>> fetchGroups() async {
    try {
      final res = await ApiClient.dio.get('/groups');
      return _list(res.data['data'], StudyGroup.fromJson);
    } on DioException catch (e) {
      throw apiFailureFrom(e, 'No se pudieron cargar tus grupos.');
    }
  }

  /// Detalle con miembros y su rendimiento (GET /groups/{id}).
  Future<StudyGroup> fetchGroup(String id) async {
    try {
      final res = await ApiClient.dio.get('/groups/$id');
      return StudyGroup.fromJson(_map(res.data['data']));
    } on DioException catch (e) {
      throw apiFailureFrom(e, 'No se pudo cargar el grupo.');
    }
  }

  Future<StudyGroup> create({
    required String name,
    required String testId,
    required String colorHex,
  }) async {
    try {
      final res = await ApiClient.dio.post(
        '/groups',
        data: {
          'name': name,
          'subjectTestId': testId,
          'requestId': await PendingOperation.id(
            'create-group',
            '$name:$testId',
          ),
        },
      );
      await PendingOperation.complete('create-group');
      return await fetchGroup(res.data['data']['id'].toString());
    } on DioException catch (e) {
      throw apiFailureFrom(e, 'No se pudo crear el grupo.');
    }
  }

  Future<void> rename(String groupId, String name) async {
    try {
      await ApiClient.dio.patch('/groups/$groupId', data: {'name': name});
    } on DioException catch (e) {
      throw apiFailureFrom(e, 'No se pudo renombrar el grupo.');
    }
  }

  Future<void> delete(String groupId) async {
    try {
      await ApiClient.dio.delete('/groups/$groupId');
    } on DioException catch (e) {
      throw apiFailureFrom(e, 'No se pudo eliminar el grupo.');
    }
  }

  /// El owner quita a un miembro; un miembro puede quitarse a sí mismo (abandonar).
  Future<void> removeMember(String groupId, String userId) async {
    try {
      await ApiClient.dio.post('/groups/$groupId/leave', data: {});
    } on DioException catch (e) {
      throw apiFailureFrom(e, 'No se pudo quitar al miembro.');
    }
  }

  Future<InvitationResult> invite(String groupId, String email) async {
    try {
      final res = await ApiClient.dio.post(
        '/groups/$groupId/invitations',
        data: {'email': email},
      );
      final d = _map(res.data['data']);
      return InvitationResult(
        invitation: GroupInvitation.fromJson(d),
        devToken: d['devToken']?.toString(),
      );
    } on DioException catch (e) {
      throw apiFailureFrom(e, 'No se pudo enviar la invitación.');
    }
  }

  Future<List<GroupInvitation>> fetchInvitations(String groupId) async {
    try {
      final res = await ApiClient.dio.get('/groups/$groupId/invitations');
      return _list(res.data['data'], GroupInvitation.fromJson);
    } on DioException catch (e) {
      throw apiFailureFrom(e, 'No se pudieron cargar las invitaciones.');
    }
  }

  /// Acepta una invitación con el token recibido por correo; devuelve el id del grupo.
  Future<String> acceptInvitation(String token) async {
    try {
      final res = await ApiClient.dio.post(
        '/groups/join',
        data: {'groupId': token},
      );
      return _map(res.data['data'])['id'].toString();
    } on DioException catch (e) {
      throw apiFailureFrom(e, 'No se pudo aceptar la invitación.');
    }
  }

  Future<GroupStats> fetchStats(String groupId) async {
    try {
      final res = await ApiClient.dio.get('/groups/$groupId/stats');
      return GroupStats.fromJson(_map(res.data['data']));
    } on DioException catch (e) {
      throw apiFailureFrom(e, 'No se pudieron cargar las estadísticas.');
    }
  }

  Future<List<SharedQuestion>> fetchShared(String groupId) async {
    try {
      final res = await ApiClient.dio.get('/groups/$groupId/shared');
      return _list(res.data['data'], SharedQuestion.fromJson);
    } on DioException catch (e) {
      throw apiFailureFrom(
        e,
        'No se pudieron cargar las preguntas compartidas.',
      );
    }
  }

  Future<void> shareQuestion({
    required String groupId,
    required String questionId,
    String? comment,
  }) async {
    try {
      await ApiClient.dio.post(
        '/posts',
        data: {
          'groupId': groupId,
          'text': comment?.trim().isNotEmpty == true
              ? comment!.trim()
              : 'Pregunta para estudiar juntos',
          'requestId': await PendingOperation.id(
            'share:$groupId',
            '$questionId:$comment',
          ),
          'questionId': questionId,
        },
      );
      await PendingOperation.complete('share:$groupId');
    } on DioException catch (e) {
      throw apiFailureFrom(e, 'No se pudo compartir la pregunta.');
    }
  }
}
