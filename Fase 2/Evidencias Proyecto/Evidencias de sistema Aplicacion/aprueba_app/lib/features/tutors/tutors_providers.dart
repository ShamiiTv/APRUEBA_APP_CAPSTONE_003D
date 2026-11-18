import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/l10n/l10n.dart';

import '../../data/social_models.dart';
import 'tutors_repository.dart';

final tutorsRepositoryProvider = Provider<TutorsRepository>(
  (ref) => TutorsRepository(locale: ref.watch(localeProvider).languageCode),
);

final tutorsProvider = FutureProvider.autoDispose<List<Tutor>>(
  (ref) => ref.watch(tutorsRepositoryProvider).fetchTutors(),
);
