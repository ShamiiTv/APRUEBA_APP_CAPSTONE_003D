import '../widgets/private_beta_notice.dart';
import '../../features/study/study_plan_screen.dart';
import '../../features/activity/activity_screen.dart';
import '../../features/practice/levels_screen.dart';
import '../storage/token_storage.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/auth_providers.dart';
import '../../features/auth/verify_email_screen.dart';

import 'package:go_router/go_router.dart';

import '../../features/splash/splash_screen.dart';
import '../../data/practice_models.dart';
import '../../data/social_models.dart';
import '../../features/auth/forgot_password_screen.dart';
import '../../features/auth/login_screen.dart';
import '../../features/auth/register_screen.dart';
import '../../features/community/community_screen.dart';
import '../../features/groups/create_group_screen.dart';
import '../../features/groups/group_detail_screen.dart';
import '../../features/groups/groups_screen.dart';
import '../../features/groups/share_question_screen.dart';
import '../../features/home/home_screen.dart';
import '../../features/medals/benefits_screen.dart';
import '../../features/notifications/notifications_screen.dart';
import '../../features/subscription/invoices_screen.dart';
import '../../features/medals/exchange_screen.dart';
import '../../features/medals/gifts_screen.dart';
import '../../features/medals/medals_screen.dart';
import '../../features/onboarding/select_tests_screen.dart';
import '../../features/practice/correction_screen.dart';
import '../../features/practice/my_corrections_screen.dart';
import '../../features/practice/practice_explanation_screen.dart';
import '../../features/practice/practice_screen.dart';
import '../../features/practice/quota_unlock_screen.dart';
import '../../features/practice/skill_screen.dart';
import '../../features/settings/my_data_screen.dart';
import '../../features/settings/settings_screen.dart';
import '../../features/subscription/checkout_screen.dart';
import '../../features/subscription/manage_plan_screen.dart';
import '../../features/subscription/payment_success_screen.dart';
import '../../features/subscription/plans_screen.dart';
import '../../features/tutors/gap_analysis_screen.dart';
import '../../features/tutors/tutor_contact_screen.dart';
import '../../features/tutors/tutor_profile_screen.dart';
import '../../features/tutors/tutors_screen.dart';
import '../widgets/main_shell.dart';
import '../../features/subscription/premium_gate_screen.dart';

final appRouter = GoRouter(
  initialLocation: '/splash',
  redirect: (context, state) async {
    final path = state.uri.path;
    if (![
          '/splash',
          '/login',
          '/register',
          '/forgot-password',
        ].contains(path) &&
        !await _hasSession()) {
      return '/login';
    }
    const pending = {
      '/practice/skill': 'Dominio por habilidad',
      '/practice/correction': 'Recorrección',
      '/corrections': 'Recorrecciones',
      '/checkout': 'Pagos',
      '/payment-success': 'Pagos',
      '/manage-plan': 'Suscripciones',
      '/invoices': 'Boletas',
    };
    if (![
      '/splash',
      '/login',
      '/register',
      '/forgot-password',
    ].contains(path)) {
      if (!context.mounted) return null;
      try {
        final profile = await ProviderScope.containerOf(
          context,
          listen: false,
        ).read(profileProvider.future);
        if (!profile.emailVerified && path != '/verify-email') {
          return '/verify-email';
        }
        if (profile.emailVerified && path == '/verify-email') {
          return profile.onboardingCompleted ? '/home' : '/select-tests';
        }
        if (profile.emailVerified &&
            !profile.onboardingCompleted &&
            path != '/select-tests') {
          return '/select-tests';
        }
      } catch (_) {
        if (path != '/verify-email') return '/verify-email';
      }
    }
    final feature = pending[path];
    if (feature != null) {
      return '/private-beta-info?feature=${Uri.encodeComponent(feature)}';
    }
    return null;
  },
  routes: [
    GoRoute(
      path: '/verify-email',
      builder: (context, state) => const VerifyEmailScreen(),
    ),
    GoRoute(
      path: '/levels',
      builder: (context, state) => LevelsScreen(
        initialTest: state.uri.queryParameters['testId'] ?? 'm1',
      ),
    ),
    GoRoute(
      path: '/private-beta-info',
      builder: (context, state) => PrivateBetaNotice(
        feature: state.uri.queryParameters['feature'] ?? 'Función pendiente',
      ),
    ),
    GoRoute(
      path: '/splash',
      builder: (context, state) => const SplashScreen(),
      redirect: (context, state) async {
        // Sin sesión: se queda en el splash y muestra Comenzar / Ya tengo cuenta.
        if (!await _hasSession() || !context.mounted) return null;
        try {
          final profile = await ProviderScope.containerOf(
            context,
            listen: false,
          ).read(profileProvider.future);
          if (!profile.emailVerified) return '/verify-email';
          return profile.onboardingCompleted ? '/home' : '/select-tests';
        } catch (_) {
          return null;
        }
      },
    ),
    GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
    GoRoute(
      path: '/register',
      builder: (context, state) => const RegisterScreen(),
    ),
    GoRoute(
      path: '/forgot-password',
      builder: (context, state) => const ForgotPasswordScreen(),
    ),
    GoRoute(
      path: '/select-tests',
      builder: (context, state) => SelectTestsScreen(
        fromSettings: state.uri.queryParameters['from'] == 'settings',
      ),
    ),
    GoRoute(
      path: '/practice',
      builder: (context, state) =>
          PracticeScreen(similarTo: state.uri.queryParameters['similarTo']),
    ),
    GoRoute(
      path: '/practice/explanation',
      builder: (context, state) {
        final extra = state.extra;
        if (extra is! ExplanationArgs) return const PracticeScreen();
        return PracticeExplanationScreen(args: extra);
      },
    ),
    GoRoute(
      path: '/practice/skill',
      builder: (context, state) {
        final extra = state.extra;
        if (extra is! ExplanationArgs) return const PracticeScreen();
        return SkillScreen(args: extra);
      },
    ),
    GoRoute(
      path: '/practice/correction',
      builder: (context, state) {
        final extra = state.extra;
        if (extra is! ExplanationArgs) return const PracticeScreen();
        return CorrectionScreen(args: extra);
      },
    ),
    GoRoute(
      path: '/premium/tutors',
      builder: (context, state) => const PremiumGateScreen(),
    ),
    GoRoute(
      path: '/corrections',
      builder: (context, state) => const MyCorrectionsScreen(),
    ),
    GoRoute(
      path: '/unlock/:step',
      builder: (context, state) {
        final step = state.pathParameters['step'] ?? 'upgrade';
        if (step == 'upgrade') return const PlansScreen(limitReached: true);
        return QuotaUnlockScreen(step: step);
      },
    ),
    GoRoute(path: '/plans', builder: (context, state) => const PlansScreen()),
    GoRoute(
      path: '/checkout',
      builder: (context, state) => CheckoutScreen(
        planId: state.uri.queryParameters['plan'] ?? '',
        cycle: state.uri.queryParameters['cycle'] ?? 'monthly',
      ),
    ),
    GoRoute(
      path: '/payment-success',
      builder: (context, state) => PaymentSuccessScreen(
        planId: state.uri.queryParameters['plan'] ?? '',
        cycle: state.uri.queryParameters['cycle'] ?? 'monthly',
      ),
    ),
    GoRoute(
      path: '/manage-plan',
      builder: (context, state) => const ManagePlanScreen(),
    ),
    GoRoute(
      path: '/my-data',
      builder: (context, state) => const MyDataScreen(),
    ),
    GoRoute(
      path: '/notifications',
      builder: (context, state) => const NotificationsScreen(),
    ),
    GoRoute(
      path: '/invoices',
      builder: (context, state) => const InvoicesScreen(),
    ),
    GoRoute(
      path: '/medals/exchange',
      builder: (context, state) => const ExchangeScreen(),
    ),
    GoRoute(
      path: '/medals/gifts',
      builder: (context, state) => const GiftsScreen(),
    ),
    GoRoute(
      path: '/medals/benefits',
      builder: (context, state) => const BenefitsScreen(),
    ),
    GoRoute(
      path: '/groups/create',
      builder: (context, state) => const CreateGroupScreen(),
    ),
    GoRoute(
      path: '/groups/detail',
      builder: (context, state) {
        final extra = state.extra;
        if (extra is! StudyGroup) return const GroupsScreen();
        return GroupDetailScreen(group: extra);
      },
    ),
    GoRoute(
      path: '/groups/share',
      builder: (context, state) {
        final extra = state.extra;
        if (extra is! Map) return const GroupsScreen();
        return ShareQuestionScreen(args: Map<String, dynamic>.from(extra));
      },
    ),
    GoRoute(
      path: '/tutors/analysis',
      builder: (context, state) => const GapAnalysisScreen(),
    ),
    GoRoute(
      path: '/tutors/profile',
      builder: (context, state) {
        final extra = state.extra;
        if (extra is! Tutor) return const TutorsScreen();
        return TutorProfileScreen(tutor: extra);
      },
    ),
    GoRoute(
      path: '/tutors/contact',
      builder: (context, state) {
        final extra = state.extra;
        if (extra is! Tutor) return const TutorsScreen();
        return TutorContactScreen(tutor: extra);
      },
    ),
    GoRoute(
      path: '/study-plan',
      builder: (context, state) => const StudyPlanScreen(),
    ),
    GoRoute(
      path: '/activity',
      builder: (context, state) => const ActivityScreen(),
    ),
    StatefulShellRoute.indexedStack(
      builder: (context, state, navigationShell) =>
          MainShell(navigationShell: navigationShell),
      branches: [
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/home',
              builder: (context, state) => const HomeScreen(),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/medals',
              builder: (context, state) => const MedalsScreen(),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/groups',
              builder: (context, state) => const GroupsScreen(),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/tutors',
              builder: (context, state) => const TutorsScreen(),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/feed',
              builder: (context, state) => const CommunityScreen(),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/settings',
              builder: (context, state) => const SettingsScreen(),
            ),
          ],
        ),
      ],
    ),
  ],
);
Future<bool> _hasSession() async {
  final token = (await TokenStorage.hasSession() ? 'session' : null);
  return token != null && token.isNotEmpty;
}
