import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/admin_provider.dart';
import '../providers/auth_provider.dart';
import '../providers/ride_provider.dart';
import '../providers/wallet_provider.dart';

final apiSyncReadyProvider = StateProvider<bool>((ref) => false);

/// Polls REST API to keep providers in sync (replaces Firestore listeners).
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

  void connect({required String userId, required String activeRole}) {
    if (_userId == userId && _timer != null) return;
    disconnect();
    _userId = userId;
    _activeRole = activeRole;
    unawaited(_syncOnce());
    _timer = Timer.periodic(const Duration(seconds: 12), (_) => _syncOnce());
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
      await ride.fetchHistory();
      await ride.refreshActiveRide();
      if (_activeRole == 'passenger') {
        final vt = auth.user?.vehicleType;
        await ride.fetchNearbyDrivers(vt != null && vt.isNotEmpty ? vt : 'delivery');
      }
      if (_activeRole == 'driver') {
        await ride.fetchDriverActiveRides();
        await ride.fetchAvailable();
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

  void dispose() => disconnect();
}
