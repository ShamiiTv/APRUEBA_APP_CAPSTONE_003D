import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/practice_models.dart';
import 'practice_repository.dart';

final practiceRepositoryProvider = Provider<PracticeRepository>(
  (ref) => PracticeRepository(),
);

final testsProvider = FutureProvider<List<PracticeTest>>(
  (ref) => ref.read(practiceRepositoryProvider).fetchTests(),
);

final progressProvider = FutureProvider<Map<String, ProgressItem>>(
  (ref) => ref.read(practiceRepositoryProvider).fetchProgress(),
);

final correctionsProvider = FutureProvider<List<CorrectionItem>>(
  (ref) => ref.read(practiceRepositoryProvider).listCorrections(),
);
