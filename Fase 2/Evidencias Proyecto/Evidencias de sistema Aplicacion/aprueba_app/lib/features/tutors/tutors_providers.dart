import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/social_models.dart';
import 'tutors_repository.dart';

final tutorsRepositoryProvider = Provider<TutorsRepository>(
  (ref) => TutorsRepository(),
);

final tutorsProvider = FutureProvider.autoDispose<List<Tutor>>(
  (ref) => ref.read(tutorsRepositoryProvider).fetchTutors(),
);
