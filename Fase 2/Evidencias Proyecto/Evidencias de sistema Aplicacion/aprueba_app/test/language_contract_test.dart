import 'package:flutter_test/flutter_test.dart';
import 'package:aprueba_app/core/l10n/system_text.dart';
import 'package:aprueba_app/core/network/api_client.dart';
import 'package:aprueba_app/core/network/api_error.dart';
import 'package:aprueba_app/data/social_models.dart';
import 'package:aprueba_app/features/auth/auth_repository.dart';

void main() {
  test('API errors follow the selected interface language and preserve error codes', () {
    final previous = ApiClient.languageCode;
    try {
      ApiClient.languageCode = 'en';
      expect(
        ApiFailure('No se pudo conectar con el servidor.').message,
        'Could not connect to the server.',
      );
      final auth = ApiException(
        'Contraseña incorrecta',
        code: 'AUTH_INVALID_CREDENTIALS',
      );
      expect(auth.message, 'Incorrect password');
      expect(auth.code, 'AUTH_INVALID_CREDENTIALS');
      expect(translateSystemText('en', 'Usuario eliminado'), 'Deleted user');
      expect(
        translateSystemText('en', 'Mi mensaje personal'),
        'Mi mensaje personal',
      );
    } finally {
      ApiClient.languageCode = previous;
    }
  });
  test('localized tutor fees use English units', () {
    final tutor = Tutor.fromJson({
      'id': 'fixture',
      'name': 'Tutor',
      'locale': 'en',
      'hourlyRate': 12000,
    });
    expect(tutor.priceLabel, contains('/ hour'));
  });
  test('removed content marker survives local reaction updates', () {
    final post = Post.fromJson({
      'id': 'fixture',
      'author': {'name': 'Usuario eliminado'},
      'text': '',
      'contentDeleted': true,
      'commentCount': 1,
    });
    expect(post.contentDeleted, true);
    expect(post.copyWith(likeCount: 2).contentDeleted, true);
  });
}
