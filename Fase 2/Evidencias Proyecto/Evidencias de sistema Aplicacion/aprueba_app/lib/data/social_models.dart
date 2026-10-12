import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';
import '../core/utils/format_utils.dart';
import 'plan_models.dart';

Color colorFromHex(String? hex, {Color fallback = AppColors.azul}) {
  if (hex == null) return fallback;
  final h = hex.replaceFirst('#', '');
  if (h.length != 6) return fallback;
  final v = int.tryParse('FF$h', radix: 16);
  return v == null ? fallback : Color(v);
}

String hexFromColor(Color c) =>
    '#${(c.toARGB32() & 0xFFFFFF).toRadixString(16).padLeft(6, '0').toUpperCase()}';

// ───────── Grupos ─────────

class GroupMember {
  final String uid;
  final String name;
  final Color color;
  final String role;
  final int score;
  final bool activeToday;

  const GroupMember({
    required this.uid,
    required this.name,
    required this.color,
    required this.role,
    required this.score,
    required this.activeToday,
  });

  bool get isOwner => role == 'owner';

  factory GroupMember.fromJson(Map<String, dynamic> j) => GroupMember(
    uid: (j['userId'] ?? j['uid'] ?? '').toString(),
    name: (j['name'] ?? 'Estudiante').toString(),
    color: colorFromHex(j['avatarColor']?.toString()),
    role: (j['role'] ?? 'member').toString(),
    score: (j['score'] as num?)?.round() ?? 0,
    activeToday: j['activeToday'] == true,
  );
}

/// Grupo de estudio. El listado trae el resumen; el detalle (GET /groups/{id}) agrega `members`.
class StudyGroup {
  final String id;
  final String name;
  final String subject; // etiqueta de la materia (ej. "Matemática M1")
  final String subjectTestId;
  final Color color;
  final int memberCount;
  final double avgScore;
  final int yourScore;
  final String ownerId;
  final List<GroupMember> members;

  const StudyGroup({
    required this.id,
    required this.name,
    required this.subject,
    required this.subjectTestId,
    required this.color,
    required this.memberCount,
    required this.avgScore,
    required this.yourScore,
    required this.ownerId,
    required this.members,
  });

  bool isOwner(String uid) => uid.isNotEmpty && ownerId == uid;

  factory StudyGroup.fromJson(Map<String, dynamic> j) {
    final raw = (j['members'] as List?) ?? const [];
    final members = raw
        .map((m) => GroupMember.fromJson(Map<String, dynamic>.from(m as Map)))
        .toList();
    return StudyGroup(
      id: j['id'].toString(),
      name: (j['name'] ?? '').toString(),
      subject: (j['subject'] ?? j['subjectTestId'] ?? '').toString(),
      subjectTestId: (j['subjectTestId'] ?? '').toString(),
      color: colorFromHex(j['color']?.toString()),
      memberCount: (j['memberCount'] as num?)?.toInt() ?? members.length,
      avgScore: (j['avgScore'] as num?)?.toDouble() ?? 0,
      yourScore: (j['yourScore'] as num?)?.round() ?? 0,
      ownerId: (j['ownerId'] ?? '').toString(),
      members: members,
    );
  }
}

class AreaScore {
  final String area;
  final int avg;

  const AreaScore({required this.area, required this.avg});

  factory AreaScore.fromJson(Map<String, dynamic> j) => AreaScore(
    area: (j['area'] ?? '').toString(),
    avg: (j['avg'] as num?)?.round() ?? 0,
  );
}

class GroupStats {
  final int avgScore;
  final int memberCount;
  final List<AreaScore> best;
  final List<AreaScore> weak;

  const GroupStats({
    required this.avgScore,
    required this.memberCount,
    required this.best,
    required this.weak,
  });

  static List<AreaScore> _areas(dynamic v) => ((v as List?) ?? const [])
      .map((e) => AreaScore.fromJson(Map<String, dynamic>.from(e as Map)))
      .toList();

  factory GroupStats.fromJson(Map<String, dynamic> j) => GroupStats(
    avgScore: (j['avgScore'] as num?)?.round() ?? 0,
    memberCount: (j['memberCount'] as num?)?.toInt() ?? 0,
    best: _areas(j['best']),
    weak: _areas(j['weak']),
  );
}

class GroupInvitation {
  final String id;
  final String email;
  final String status;

  const GroupInvitation({
    required this.id,
    required this.email,
    required this.status,
  });

  factory GroupInvitation.fromJson(Map<String, dynamic> j) => GroupInvitation(
    id: j['id'].toString(),
    email: (j['email'] ?? '').toString(),
    status: (j['status'] ?? 'pending').toString(),
  );
}

/// Resultado de invitar: en desarrollo la API devuelve además el token (correo simulado).
class InvitationResult {
  final GroupInvitation invitation;
  final String? devToken;

  const InvitationResult({required this.invitation, required this.devToken});
}

// ───────── Regalos ─────────

class GiftFriend {
  final String userId;
  final String name;
  final int giftedToday;

  const GiftFriend({
    required this.userId,
    required this.name,
    required this.giftedToday,
  });

  factory GiftFriend.fromJson(Map<String, dynamic> j) => GiftFriend(
    userId: (j['userId'] ?? '').toString(),
    name: (j['name'] ?? 'Estudiante').toString(),
    giftedToday: (j['giftedToday'] as num?)?.toInt() ?? 0,
  );
}

class GiftsState {
  final int used;
  final int max;
  final int bronzeAvailable;
  final List<GiftFriend> friends;

  const GiftsState({
    required this.used,
    required this.max,
    required this.bronzeAvailable,
    required this.friends,
  });

  int get remaining => (max - used).clamp(0, max);

  factory GiftsState.fromJson(Map<String, dynamic> j) {
    final d = (j['daily'] is Map)
        ? Map<String, dynamic>.from(j['daily'] as Map)
        : <String, dynamic>{};
    return GiftsState(
      used: (d['used'] as num?)?.toInt() ?? 0,
      max: (d['max'] as num?)?.toInt() ?? 10,
      bronzeAvailable: (j['bronzeAvailable'] as num?)?.toInt() ?? 0,
      friends: ((j['friends'] as List?) ?? const [])
          .map((f) => GiftFriend.fromJson(Map<String, dynamic>.from(f as Map)))
          .toList(),
    );
  }
}

// ───────── Comunidad ─────────

class PostComment {
  final String id;
  final String authorName;
  final Color authorColor;
  final String text;
  final DateTime? createdAt;

  const PostComment({
    required this.id,
    required this.authorName,
    required this.authorColor,
    required this.text,
    required this.createdAt,
  });

  factory PostComment.fromJson(Map<String, dynamic> j) {
    final a = (j['author'] is Map)
        ? Map<String, dynamic>.from(j['author'] as Map)
        : <String, dynamic>{};
    return PostComment(
      id: (j['id'] ?? '').toString(),
      authorName: (a['name'] ?? 'Estudiante').toString(),
      authorColor: colorFromHex(a['avatarColor']?.toString()),
      text: (j['text'] ?? '').toString(),
      createdAt: parseApiDate(j['createdAt']),
    );
  }
}

class Post {
  final String id;
  final String authorName;
  final Color authorColor;
  final String text;
  final String? questionStatement;
  final int likeCount;
  final int commentCount;
  final bool userLiked;
  final DateTime? createdAt;
  final List<PostComment> comments; // se cargan al abrir la publicación

  const Post({
    required this.id,
    required this.authorName,
    required this.authorColor,
    required this.text,
    required this.questionStatement,
    required this.likeCount,
    required this.commentCount,
    required this.userLiked,
    required this.createdAt,
    required this.comments,
  });

  Post copyWith({
    int? likeCount,
    int? commentCount,
    bool? userLiked,
    List<PostComment>? comments,
  }) => Post(
    id: id,
    authorName: authorName,
    authorColor: authorColor,
    text: text,
    questionStatement: questionStatement,
    likeCount: likeCount ?? this.likeCount,
    commentCount: commentCount ?? this.commentCount,
    userLiked: userLiked ?? this.userLiked,
    createdAt: createdAt,
    comments: comments ?? this.comments,
  );

  /// Forma del documento de API: { id, author:{name}, text, question:{id}, likes, comments, createdAt }.
  factory Post.fromJson(Map<String, dynamic> j) {
    final a = (j['author'] is Map)
        ? Map<String, dynamic>.from(j['author'] as Map)
        : <String, dynamic>{};
    final q = j['question'];
    String? statement;
    if (q is Map) {
      statement = q['statement']?.toString();
    } else if (q is String && q.isNotEmpty) {
      statement = q;
    }
    final cm = j['comments'];
    return Post(
      id: j['id'].toString(),
      authorName: (a['name'] ?? 'Estudiante').toString(),
      authorColor: colorFromHex(a['avatarColor']?.toString()),
      text: (j['text'] ?? '').toString(),
      questionStatement: (statement == null || statement.isEmpty)
          ? null
          : statement,
      likeCount: ((j['likes'] ?? j['likeCount']) as num?)?.toInt() ?? 0,
      commentCount:
          (j['commentCount'] as num?)?.toInt() ??
          (cm is num ? cm.toInt() : (cm is List ? cm.length : 0)),
      userLiked: j['userLiked'] == true || j['liked'] == true,
      createdAt: parseApiDate(j['createdAt']),
      comments: const [],
    );
  }
}

// ───────── Tutores ─────────

class Tutor {
  final String id;
  final String name;
  final String subjectLabel;
  final String subjectTestId;
  final Color color;
  final String? specialty;
  final String? university;
  final String? bio;
  final String? mode;
  final String? priceLabel;
  final double? rating;
  final int? reviewsCount;
  final int? experienceYears;
  final bool verified;

  const Tutor({
    required this.id,
    required this.name,
    required this.subjectLabel,
    required this.subjectTestId,
    required this.color,
    required this.specialty,
    required this.university,
    required this.bio,
    required this.mode,
    required this.priceLabel,
    required this.rating,
    required this.reviewsCount,
    required this.experienceYears,
    required this.verified,
  });

  /// Solo se usan los campos que existan en el documento del tutor.
  factory Tutor.fromJson(Map<String, dynamic> j) {
    String? s(dynamic v) {
      final t = v?.toString().trim();
      return (t == null || t.isEmpty) ? null : t;
    }

    int? i(dynamic v) => v is num ? v.toInt() : null;

    final rawPrice = j['hourlyRate'] ?? j['pricePerHour'] ?? j['price'];
    final price = rawPrice is num
        ? '${formatClp(rawPrice.toInt())} / hora'
        : s(rawPrice);
    final rawRating = j['rating'] ?? j['rate'];

    return Tutor(
      id: j['id'].toString(),
      name: s(j['name']) ?? 'Tutor',
      subjectLabel: s(j['subjectLabel']) ?? '',
      subjectTestId: s(j['subjectTestId']) ?? '',
      color: colorFromHex(s(j['avatarColor']) ?? s(j['color'])),
      specialty: s(j['specialty']),
      university: s(j['university']),
      bio: s(j['bio'] ?? j['description']),
      mode: s(j['mode'] ?? j['modality']),
      priceLabel: price,
      rating: rawRating is num ? rawRating.toDouble() : null,
      reviewsCount: i(j['reviewsCount'] ?? j['reviews'] ?? j['nrev']),
      experienceYears: i(j['experienceYears'] ?? j['exp']),
      verified: j['verified'] == true,
    );
  }
}
