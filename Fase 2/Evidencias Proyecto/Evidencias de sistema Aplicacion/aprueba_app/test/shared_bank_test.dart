import 'package:flutter_test/flutter_test.dart';
import 'package:aprueba_app/data/practice_models.dart';
import 'package:aprueba_app/data/user_profile.dart';
import 'package:aprueba_app/data/social_models.dart';

void main() {
  test('Canonical option IDs survive parsing without exposing answers', () {
    final next = NextQuestion.fromResponse({
      'question': {
        'id': 'q_canonical',
        'testId': 'm2',
        'statement': 'Pregunta revisada',
        'options': [
          {'id': 'D', 'text': 'Alternativa revisada'},
          {'id': 'A', 'text': 'Otra alternativa'},
        ],
      },
      'allCompleted': false,
      'user': {
        'quota': {'used': 3, 'max': 20, 'unlimited': false},
      },
    }, {});
    expect(next.question!.options.first.id, 'D');
    expect(next.question!.options.first.text, 'Alternativa revisada');
    expect(next.quota!.max, 20);
    expect(next.quota!.used, 3);
  });
  test(
    'An empty difficulty is different from completed available questions',
    () {
      final next = NextQuestion.fromResponse({
        'question': null,
        'allCompleted': false,
        'noQuestions': true,
      }, {});
      expect(next.question, isNull);
      expect(next.allCompleted, isFalse);
    },
  );
  test('Feedback and awards come from the shared API', () {
    final result = AnswerResult.fromJson({
      'isCorrect': true,
      'correctAnswer': 'D',
      'explanation': 'Solución revisada',
      'bronzeEarned': 1,
      'user': {
        'quota': {'used': 1, 'max': 20},
      },
    });
    expect(result.isCorrect, isTrue);
    expect(result.correctAnswers, ['D']);
    expect(result.bronzeEarned, 1);
    expect(result.explanation, 'Solución revisada');
    expect(result.cohortPercentile, isNull);
    expect(
      AnswerResult.fromJson({
        'isCorrect': true,
        'bronzeEarned': 0,
        'alreadyAnswered': true,
      }).bronzeEarned,
      0,
    );
  });
  test('Profiles preserve the onboarding and shared preferences contract', () {
    final p = UserProfile.fromJson({
      'uid': 'student',
      'onboardingCompleted': true,
      'quota': {'max': 20},
      'practiceFormat': 'random',
    });
    expect(p.onboardingCompleted, isTrue);
    expect(p.quotaMax, 20);
    expect(p.format, 'random');
  });
  test('Shared community counts and desired reaction state are parsed', () {
    final post = Post.fromJson({
      'id': 'post',
      'author': {'name': 'Alumno'},
      'userLiked': true,
      'likeCount': 4,
      'commentCount': 2,
    });
    expect(post.userLiked, isTrue);
    expect(post.likeCount, 4);
    expect(post.commentCount, 2);
  });
}
