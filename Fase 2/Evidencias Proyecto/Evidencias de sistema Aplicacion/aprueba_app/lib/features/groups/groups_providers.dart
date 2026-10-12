import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/practice_models.dart';
import '../../data/shared_models.dart';
import '../../data/social_models.dart';
import 'groups_repository.dart';

final groupsRepositoryProvider = Provider<GroupsRepository>(
  (ref) => GroupsRepository(),
);

final groupsProvider = FutureProvider.autoDispose<List<StudyGroup>>(
  (ref) => ref.read(groupsRepositoryProvider).fetchGroups(),
);

final groupDetailProvider = FutureProvider.autoDispose
    .family<StudyGroup, String>(
      (ref, groupId) => ref.read(groupsRepositoryProvider).fetchGroup(groupId),
    );

final groupStatsProvider = FutureProvider.autoDispose
    .family<GroupStats, String>(
      (ref, groupId) => ref.read(groupsRepositoryProvider).fetchStats(groupId),
    );

final groupInvitationsProvider = FutureProvider.autoDispose
    .family<List<GroupInvitation>, String>(
      (ref, groupId) =>
          ref.read(groupsRepositoryProvider).fetchInvitations(groupId),
    );

final sharedQuestionsProvider = FutureProvider.autoDispose
    .family<List<SharedQuestion>, String>(
      (ref, groupId) => ref.read(groupsRepositoryProvider).fetchShared(groupId),
    );

String testLabelOf(List<PracticeTest> tests, String id) {
  for (final t in tests) {
    if (t.id == id) return t.label;
  }
  return id;
}
