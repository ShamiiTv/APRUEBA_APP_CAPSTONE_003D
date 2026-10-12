import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/benefit_models.dart';
import '../../data/social_models.dart';
import 'medals_repository.dart';

final medalsRepositoryProvider = Provider<MedalsRepository>(
  (ref) => MedalsRepository(),
);

final benefitsProvider = FutureProvider.autoDispose<List<Benefit>>(
  (ref) => ref.read(medalsRepositoryProvider).fetchBenefits(),
);

final giftsProvider = FutureProvider.autoDispose<GiftsState>(
  (ref) => ref.read(medalsRepositoryProvider).fetchGifts(),
);
