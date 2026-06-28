import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/auth_provider.dart';
import '../services/debug_logger.dart';
import '../utils/auth_navigation.dart';
import '../../features/auth/weret_onboarding_screen.dart';
import '../../features/auth/login_screen.dart';
import '../../features/auth/driver_onboarding_screen.dart';
import '../../features/auth/register_choice_screen.dart';
import '../../features/auth/passenger_register_screen.dart';
import '../../features/auth/driver_register_screen.dart';
import '../../features/auth/forgot_password_screen.dart';
import '../../features/auth/in_app_call_screen.dart';
import '../../features/auth/ride_chat_screen.dart';
import '../../features/safety/emergency_sos_screen.dart';
import '../../features/safety/trusted_contacts_screen.dart';
import '../../features/safety/share_live_trip_screen.dart';
import '../../features/safety/verify_driver_screen.dart';
import '../../features/safety/report_incident_screen.dart';
import '../../features/safety/block_user_screen.dart';
import '../../features/safety/emergency_hotline_screen.dart';
import '../../features/auth/user_dispute_screen.dart';
import '../../features/auth/user_dispute_chat_screen.dart';
import '../../features/driver/driver_status_screens.dart';
import '../../features/driver/driver_request_detail_screen.dart';
import '../../features/debug/debug_log_screen.dart';
import '../../features/more/rating_history_screen.dart';
import '../../features/shared_rides/shared_rides_screen.dart';
import '../../features/shared_rides/shared_ride_detail_screen.dart';
import 'passenger_shell.dart';
import 'driver_shell.dart';
import 'admin_shell.dart';

class _ScreenLogObserver extends NavigatorObserver {
  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    final name = route.settings.name ?? route.settings.toString();
    final prev = previousRoute?.settings.name ?? 'start';
    DebugLogger.instance.navigation(prev, name);
    DebugLogger.instance.setCurrentScreen(name);
  }

  @override
  void didPop(Route<dynamic> route, Route<dynamic>? previousRoute) {
    final name = route.settings.name ?? route.settings.toString();
    final prev = previousRoute?.settings.name ?? 'none';
    DebugLogger.instance.log(LogLevel.navigation, 'POP', '$name ← $prev');
    if (previousRoute != null) {
      DebugLogger.instance.setCurrentScreen(previousRoute.settings.name ?? '?');
    }
  }

  @override
  void didReplace({Route<dynamic>? newRoute, Route<dynamic>? oldRoute}) {
    final newName = newRoute?.settings.name ?? '?';
    final oldName = oldRoute?.settings.name ?? '?';
    DebugLogger.instance.log(LogLevel.navigation, 'REPLACE', '$oldName → $newName');
    if (newRoute != null) {
      DebugLogger.instance.setCurrentScreen(newName);
    }
  }
}

final rootNavigatorKey = GlobalKey<NavigatorState>();

final appRouterProvider = Provider<GoRouter>((ref) {
  final router = GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: '/onboarding',
    observers: [_ScreenLogObserver()],
    redirect: (context, state) {
      final auth = ref.read(authProvider);
      if (!auth.hydrated) {
        DebugLogger.instance.log(LogLevel.navigation, 'REDIRECT', '${state.matchedLocation} → skip (not hydrated)');
        return null;
      }
      final loggedIn = auth.isAuthenticated;
      final loc = state.matchedLocation;
      final isAuthRoute = loc.startsWith('/onboarding') ||
          loc.startsWith('/login') ||
          loc.startsWith('/register') ||
          loc.startsWith('/forgot-password') ||
          loc == '/driver/onboarding' ||
          loc == '/driver/application-received' ||
          loc == '/driver/verification-status';

      if (!loggedIn && !isAuthRoute) {
        DebugLogger.instance.log(LogLevel.navigation, 'REDIRECT', '$loc → /login (unauthenticated)');
        return '/login';
      }
      if (loggedIn && loc == '/register/driver' && auth.user?.role == 'driver') {
        DebugLogger.instance.log(LogLevel.navigation, 'REDIRECT', '$loc → /driver/home (already driver)');
        return '/driver/home';
      }
      if (loggedIn && isAuthRoute && loc != '/driver/onboarding' && loc != '/driver/application-received' && loc != '/driver/verification-status') {
        final home = AuthNavigation.homeForUser(auth.user);
        DebugLogger.instance.log(LogLevel.navigation, 'REDIRECT', '$loc → $home (already logged in)');
        return home;
      }

      if (loggedIn) {
        final role = auth.user?.effectiveRole ?? 'passenger';
        if (auth.user?.role == 'admin' && !loc.startsWith('/admin')) {
          DebugLogger.instance.log(LogLevel.navigation, 'REDIRECT', '$loc → /admin/dashboard (admin role)');
          return '/admin/dashboard';
        }
        if (auth.user?.role != 'admin' && loc.startsWith('/admin')) {
          final home = AuthNavigation.homeForUser(auth.user);
          DebugLogger.instance.log(LogLevel.navigation, 'REDIRECT', '$loc → $home (not admin)');
          return home;
        }
        if (role == 'passenger' &&
            loc.startsWith('/driver') &&
            loc != '/driver/onboarding' &&
            loc != '/driver/application-received' &&
            loc != '/driver/verification-status') {
          DebugLogger.instance.log(LogLevel.navigation, 'REDIRECT', '$loc → /passenger/home (passenger role)');
          return '/passenger/home';
        }
        if (role == 'driver' && loc.startsWith('/passenger')) {
          DebugLogger.instance.log(LogLevel.navigation, 'REDIRECT', '$loc → /driver/home (driver role)');
          return '/driver/home';
        }
      }
      return null;
    },
    routes: [
      GoRoute(path: '/onboarding', builder: (_, __) => const WeretOnboardingScreen()),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/forgot-password', builder: (_, __) => const ForgotPasswordScreen()),
      GoRoute(path: '/register', builder: (_, __) => const RegisterChoiceScreen()),
      GoRoute(path: '/register/passenger', builder: (_, __) => const PassengerRegisterScreen()),
      GoRoute(path: '/register/driver', builder: (_, __) => const DriverRegisterScreen()),
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
      GoRoute(path: '/debug/log', builder: (_, __) => const DebugLogScreen()),
      GoRoute(path: '/safety/emergency', builder: (_, s) => EmergencySosScreen(rideId: s.extra as String?)),
      GoRoute(path: '/safety/trusted-contacts', builder: (_, __) => const TrustedContactsScreen()),
      GoRoute(path: '/safety/share-trip', builder: (_, s) => ShareLiveTripScreen(rideId: s.extra as String? ?? '')),
      GoRoute(path: '/safety/verify-driver', builder: (_, s) {
        final e = s.extra as Map<String, dynamic>?;
        return VerifyDriverScreen(
          driverName: e?['driverName'] as String? ?? '',
          driverPhoto: e?['driverPhoto'] as String? ?? '',
          vehicleModel: e?['vehicleModel'] as String? ?? '',
          vehicleColor: e?['vehicleColor'] as String? ?? '',
          plateNumber: e?['plateNumber'] as String? ?? '',
          rating: (e?['rating'] as num?)?.toDouble() ?? 0.0,
        );
      }),
      GoRoute(path: '/safety/report', builder: (_, s) => ReportIncidentScreen(reportedUserId: s.extra is String ? s.extra as String? : null)),
      GoRoute(path: '/safety/blocked', builder: (_, __) => const BlockUserScreen()),
      GoRoute(path: '/safety/hotline', builder: (_, __) => const EmergencyHotlineScreen()),
      GoRoute(path: '/disputes', builder: (_, __) => const UserDisputeScreen()),
      GoRoute(path: '/dispute/:id', builder: (c, s) => UserDisputeChatScreen(disputeId: s.pathParameters['id']!)),
      GoRoute(path: '/ratings', builder: (_, __) => const RatingHistoryScreen()),
      GoRoute(path: '/ratings/received', builder: (_, __) => const RatingHistoryScreen(isDriver: true)),
      GoRoute(path: '/shared-rides', builder: (_, __) => const SharedRidesScreen()),
      GoRoute(
        path: '/shared-rides/:id',
        builder: (c, s) => SharedRideDetailScreen(rideId: s.pathParameters['id']!),
      ),
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

