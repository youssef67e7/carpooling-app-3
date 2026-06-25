import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../providers/admin_provider.dart';
import '../providers/auth_provider.dart';
import '../providers/ride_provider.dart';
import '../providers/wallet_provider.dart';
import '../services/fcm_service.dart';

final apiSyncReadyProvider = StateProvider<bool>((ref) => false);

/// Polls REST API to keep providers in sync (replaces Firestore listeners
/// and Socket.IO). Polling frequency adapts to ride state.
/// FCM push notifications are the primary real-time mechanism; polling is
/// a fallback that also covers wallet/history/vehicle catalog updates.
final apiSyncBridgeProvider = Provider<void>((ref) {
  final bridge = _ApiSyncBridge(ref);
  ref.onDispose(bridge.dispose);

  ref.listen<AuthState>(authProvider, (prev, next) {
    if (!next.hydrated) return;
    if (next.isAuthenticated && next.user != null && next.user!.id.isNotEmpty) {
      final u = next.user!;
      bridge.connect(userId: u.id, activeRole: u.effectiveRole);
    } else {
      bridge.disconnect();
    }
  }, fireImmediately: true);
});

class _ApiSyncBridge {
  _ApiSyncBridge(this._ref);

  final Ref _ref;
  Timer? _timer;
  String? _userId;
  String _activeRole = 'passenger';
  bool _fcmInitialized = false;
  StreamSubscription<String>? _tokenSub;

  Duration _pollInterval() {
    if (_userId == null) return const Duration(seconds: 30);
    try {
      final rideState = _ref.read(rideProvider);
      final active = rideState.activeRide;
      if (active == null) return const Duration(seconds: 20);
      final status = '${active['status']}';
      if (status == 'accepted' || status == 'ongoing') return const Duration(seconds: 6);
      if (status == 'pending') return const Duration(seconds: 10);
      return const Duration(seconds: 20);
    } catch (_) {
      return const Duration(seconds: 20);
    }
  }

  void connect({required String userId, required String activeRole}) {
    if (_userId == userId && _timer != null) return;
    disconnect();
    _userId = userId;
    _activeRole = activeRole;
    _initFcm().catchError((_) {});
    unawaited(_syncOnce());
    _scheduleNext();
  }

  Future<void> _initFcm() async {
    if (_fcmInitialized) return;
    _fcmInitialized = true;

    await FcmService.initialize();

    _tokenSub = FcmService.listenTokenRefresh((token) {
      _registerFcmToken().catchError((_) {});
    });

    await _registerFcmToken();
  }

  Future<void> _registerFcmToken() async {
    try {
      final api = await _ref.read(apiClientProvider.future);
      await FcmService.registerToken(api);
    } catch (_) {}
  }

  void _scheduleNext() {
    _timer?.cancel();
    _timer = Timer(_pollInterval(), () async {
      await _syncOnce();
      _scheduleNext();
    });
  }

  Future<void> _syncOnce() async {
    final userId = _userId;
    if (userId == null) return;
    try {
      final auth = _ref.read(authProvider);
      if (auth.user?.role == 'admin') {
        await _ref.read(adminProvider.notifier).fetchStats();
        _ref.read(apiSyncReadyProvider.notifier).state = true;
        return;
      }
      final ride = _ref.read(rideProvider.notifier);
      final wallet = _ref.read(walletProvider.notifier);
      await ride.fetchVehicles();
      await wallet.refresh();
      await ride.refreshActiveRide();
      if (_activeRole == 'passenger') {
        final vt = auth.user?.vehicleType;
        await ride.fetchNearbyDrivers(vt != null && vt.isNotEmpty ? vt : 'delivery');
      }
      if (_activeRole == 'driver') {
        await ride.fetchDriverActiveRides();
        await ride.fetchAvailable();
        await ride.fetchHistory();
      }
      _ref.read(apiSyncReadyProvider.notifier).state = true;
    } catch (_) {
      _ref.read(apiSyncReadyProvider.notifier).state = false;
    }
  }

  void disconnect() {
    _timer?.cancel();
    _timer = null;
    _userId = null;
    _ref.read(apiSyncReadyProvider.notifier).state = false;
  }

  void dispose() {
    _tokenSub?.cancel();
    disconnect();
  }
}
