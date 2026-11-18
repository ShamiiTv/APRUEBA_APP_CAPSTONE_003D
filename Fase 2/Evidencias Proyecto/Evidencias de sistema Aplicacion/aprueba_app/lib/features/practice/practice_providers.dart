import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/practice_models.dart';
import 'practice_repository.dart';

final practiceRepositoryProvider = Provider<PracticeRepository>(
  (ref) => PracticeRepository(),
);

final testsProvider = FutureProvider<List<PracticeTest>>(
  (ref) => ref.read(practiceRepositoryProvider).fetchTests(),
);

final progressSnapshotProvider = FutureProvider<Map<String, dynamic>>(
  (ref) => ref.read(practiceRepositoryProvider).fetchProgressData(),
);

final progressProvider = FutureProvider<Map<String, ProgressItem>>(
  (ref) async => PracticeRepository.progressItems(
    await ref.watch(progressSnapshotProvider.future),
  ),
);

final correctionsProvider = FutureProvider<List<CorrectionItem>>(
  (ref) => ref.read(practiceRepositoryProvider).listCorrections(),
);
