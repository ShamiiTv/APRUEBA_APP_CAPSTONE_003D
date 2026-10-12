import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/user_profile.dart';
import 'auth_repository.dart';

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AuthRepository(),
);

/// Perfil del usuario logueado. Se carga una vez y las pantallas lo comparten.
class ProfileNotifier extends AsyncNotifier<UserProfile> {
  @override
  Future<UserProfile> build() {
    return ref.read(authRepositoryProvider).fetchProfile();
  }

  /// Vuelve a pedir el perfil sin mostrar el spinner (mantiene los datos
  /// anteriores en pantalla hasta que lleguen los nuevos).
  Future<void> refresh() async {
    state = await AsyncValue.guard(
      () => ref.read(authRepositoryProvider).fetchProfile(),
    );
  }
}

final profileProvider = AsyncNotifierProvider<ProfileNotifier, UserProfile>(
  ProfileNotifier.new,
);
