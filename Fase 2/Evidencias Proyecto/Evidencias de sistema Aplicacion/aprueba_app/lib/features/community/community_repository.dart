import 'package:dio/dio.dart';

import '../../core/storage/pending_operation.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_error.dart';
import '../../data/social_models.dart';

class FeedPage {
  final List<Post> posts;
  final String? nextCursor;

  const FeedPage({required this.posts, required this.nextCursor});
}

class CommunityRepository {
  /// GET /feed paginado por cursor.
  Future<FeedPage> fetchFeed({String? cursor, int limit = 20}) async {
    try {
      final res = await ApiClient.dio.get(
        '/posts',
        queryParameters: {'limit': limit, 'cursor': ?cursor},
      );
      final list = (res.data['data'] as List?) ?? const [];
      final meta = res.data['meta'];
      final next = meta is Map ? meta['nextCursor']?.toString() : null;
      return FeedPage(
        posts: list
            .map((p) => Post.fromJson(Map<String, dynamic>.from(p as Map)))
            .toList(),
        nextCursor: next,
      );
    } on DioException catch (e) {
      throw apiFailureFrom(e, 'No se pudo cargar el muro.');
    }
  }

  Future<Post> createPost(String text) async {
    try {
      final res = await ApiClient.dio.post(
        '/posts',
        data: {
          'text': text,
          'requestId': await PendingOperation.id('post', text),
        },
      );
      await PendingOperation.complete('post');
      return Post.fromJson(Map<String, dynamic>.from(res.data['data']));
    } on DioException catch (e) {
      throw apiFailureFrom(e, 'No se pudo publicar.');
    }
  }

  Future<({bool liked, int likeCount})> toggleLike(
    String postId, {
    required bool liked,
  }) async {
    try {
      final res = await ApiClient.dio.post(
        '/posts/$postId/like',
        data: {'liked': liked},
      );
      final d = Map<String, dynamic>.from(res.data['data']);
      return (
        liked: d['liked'] == true,
        likeCount: (d['likeCount'] as num?)?.toInt() ?? 0,
      );
    } on DioException catch (e) {
      throw apiFailureFrom(e, 'No se pudo registrar tu me gusta.');
    }
  }

  Future<List<PostComment>> fetchComments(String postId) async {
    try {
      final res = await ApiClient.dio.get('/posts/$postId/comments');
      final list = (res.data['data'] as List?) ?? const [];
      return list
          .map((c) => PostComment.fromJson(Map<String, dynamic>.from(c as Map)))
          .toList();
    } on DioException catch (e) {
      throw apiFailureFrom(e, 'No se pudieron cargar los comentarios.');
    }
  }

  Future<PostComment> addComment(String postId, String text) async {
    try {
      final res = await ApiClient.dio.post(
        '/posts/$postId/comments',
        data: {
          'text': text,
          'requestId': await PendingOperation.id('comment:$postId', text),
        },
      );
      await PendingOperation.complete('comment:$postId');
      return PostComment.fromJson(Map<String, dynamic>.from(res.data['data']));
    } on DioException catch (e) {
      throw apiFailureFrom(e, 'No se pudo comentar.');
    }
  }
}
