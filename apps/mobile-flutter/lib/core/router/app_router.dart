import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/auth_provider.dart';
import '../utils/auth_navigation.dart';
import '../../features/auth/weret_onboarding_screen.dart';
import '../../features/auth/login_screen.dart';
import '../../features/auth/register_choice_screen.dart';
import '../../features/auth/passenger_register_screen.dart';
import '../../features/auth/driver_register_screen.dart';
import '../../features/auth/legacy_screens.dart';
import '../../features/auth/forgot_password_screen.dart';
import '../../features/auth/phone_register_screen.dart';
import '../../features/auth/ride_chat_screen.dart';
import '../../features/driver/driver_status_screens.dart';
import '../../features/driver/driver_request_detail_screen.dart';
import 'passenger_shell.dart';
import 'driver_shell.dart';
import 'admin_shell.dart';

class _ScreenLogObserver extends NavigatorObserver {
  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    debugPrint('📱 OPENED ${route.settings.name ?? route.settings.toString()}');
  }
}

final _rootKey = GlobalKey<NavigatorState>();

final appRouterProvider = Provider<GoRouter>((ref) {
  final router = GoRouter(
    navigatorKey: _rootKey,
    initialLocation: '/onboarding',
    observers: [_ScreenLogObserver()],
    redirect: (context, state) {
      final auth = ref.read(authProvider);
      if (!auth.hydrated) return null;
      final loggedIn = auth.isAuthenticated;
      final loc = state.matchedLocation;
      final isAuthRoute = loc.startsWith('/onboarding') ||
          loc.startsWith('/login') ||
          loc.startsWith('/register') ||
          loc.startsWith('/forgot-password') ||
          loc == '/driver/onboarding' ||
          loc == '/driver/application-received' ||
          loc == '/driver/verification-status';

      if (!loggedIn && !isAuthRoute) return '/login';
      if (loggedIn && loc == '/register/driver') return '/passenger/more/driver-onboarding';
      if (loggedIn && isAuthRoute && loc != '/driver/onboarding' && loc != '/driver/application-received' && loc != '/driver/verification-status') {
        return AuthNavigation.homeForUser(auth.user);
      }

      if (loggedIn) {
        final role = auth.user?.effectiveRole ?? 'passenger';
        if (auth.user?.role == 'admin' && !loc.startsWith('/admin')) return '/admin/dashboard';
        if (auth.user?.role != 'admin' && loc.startsWith('/admin')) return AuthNavigation.homeForUser(auth.user);
        if (role == 'passenger' &&
            loc.startsWith('/driver') &&
            loc != '/driver/onboarding' &&
            loc != '/driver/application-received' &&
            loc != '/driver/verification-status') {
          return '/passenger/home';
        }
        if (role == 'driver' && loc.startsWith('/passenger')) return '/driver/home';
      }
      return null;
    },
    routes: [
      GoRoute(path: '/onboarding', builder: (_, __) => const WeretOnboardingScreen()),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/forgot-password', builder: (_, __) => const ForgotPasswordScreen()),
      GoRoute(path: '/register', builder: (_, __) => const RegisterChoiceScreen()),
      GoRoute(path: '/register/passenger', builder: (_, __) => const PassengerRegisterScreen()),
      GoRoute(
        path: '/register/passenger/phone',
        builder: (_, __) => const PhoneRegisterScreen(forDriver: false),
      ),
      GoRoute(path: '/register/driver', builder: (_, __) => const DriverRegisterScreen()),
      GoRoute(
        path: '/register/driver/phone',
        builder: (_, __) => const PhoneRegisterScreen(forDriver: true),
      ),
      GoRoute(
        path: '/register/phone',
        redirect: (_, state) {
          if (state.uri.queryParameters['driver'] == '1') return '/register/driver/phone';
          return '/register/passenger/phone';
        },
      ),
      GoRoute(path: '/driver/onboarding', builder: (_, __) => const DriverOnboardingScreen()),
      GoRoute(path: '/driver/application-received', builder: (_, __) => const DriverApplicationReceivedScreen()),
      GoRoute(path: '/driver/verification-status', builder: (_, __) => const DriverVerificationStatusScreen()),
      GoRoute(
        path: '/driver/request/:rideId',
        builder: (c, s) {
          final extra = s.extra as Map<String, dynamic>?;
          return DriverRequestDetailScreen(rideId: s.pathParameters['rideId']!, initialRide: extra);
        },
      ),
      GoRoute(path: '/ride-chat/:rideId', builder: (c, s) => RideChatScreen(rideId: s.pathParameters['rideId']!)),
      GoRoute(path: '/in-app-call/:rideId', builder: (c, s) => InAppCallScreen(rideId: s.pathParameters['rideId']!)),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) => PassengerShell(navigationShell: navigationShell),
        branches: [
          PassengerShell.homeBranch(),
          PassengerShell.historyBranch(),
          PassengerShell.moreBranch(),
          PassengerShell.settingsBranch(),
        ],
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) => DriverShell(navigationShell: navigationShell),
        branches: DriverShell.branches(),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) => AdminShell(navigationShell: navigationShell),
        branches: AdminShell.branches(),
      ),
    ],
  );

  ref.listen(authProvider, (_, __) => router.refresh());

  return router;
});

