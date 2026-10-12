import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'community_repository.dart';

final communityRepositoryProvider = Provider<CommunityRepository>(
  (ref) => CommunityRepository(),
);
