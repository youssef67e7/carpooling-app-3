import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import '../providers/auth_provider.dart';
import '../providers/admin_provider.dart';
import '../providers/ride_provider.dart';
import 'socket_service.dart';

final socketServiceProvider = Provider<SocketService>((ref) {
  final service = SocketService();
  ref.onDispose(service.disconnect);
  return service;
});

void _bindRealtimeHandlers(Ref ref, SocketService socket) {
  socket.off('ride:update');
  socket.on('ride:update', (data) {
    if (data is! Map) return;
    final ride = data['ride'];
    if (ride is Map<String, dynamic>) {
      ref.read(rideProvider.notifier).handleRideUpdate('${data['type']}', ride);
    }
    final user = ref.read(authProvider).user;
    if (user?.role == 'admin') {
      ref.read(adminProvider.notifier).fetchStats();
    }
  });

  socket.off('driver:location');
  socket.on('driver:location', (data) {
    if (data is! Map) return;
    ref.read(rideProvider.notifier).applyDriverLocation(Map<String, dynamic>.from(data));
  });
}

/// Connects Socket.IO when authenticated and forwards ride events to [rideProvider].
final realtimeBridgeProvider = Provider<void>((ref) {
  ref.listen<AuthState>(authProvider, (prev, next) {
    final socket = ref.read(socketServiceProvider);
    if (!next.hydrated) return;

    if (next.isAuthenticated && next.token != null) {
      socket.connect(ApiConfig.baseUrl, next.token!);
      _bindRealtimeHandlers(ref, socket);
      return;
    }

    socket.disconnect();
  });
});
