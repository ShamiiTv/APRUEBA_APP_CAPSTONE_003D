import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/plan_models.dart';
import 'subscription_repository.dart';

final subscriptionRepositoryProvider = Provider<SubscriptionRepository>(
  (ref) => SubscriptionRepository(),
);

final plansProvider = FutureProvider<List<Plan>>(
  (ref) => ref.read(subscriptionRepositoryProvider).fetchPlans(),
);

final subscriptionProvider = FutureProvider.autoDispose<SubscriptionInfo>(
  (ref) => ref.read(subscriptionRepositoryProvider).fetchSubscription(),
);

final invoicesProvider = FutureProvider.autoDispose<List<Invoice>>(
  (ref) => ref.read(subscriptionRepositoryProvider).fetchInvoices(),
);
