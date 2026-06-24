import 'package:socket_io_client/socket_io_client.dart' as io;

class SocketService {
  io.Socket? _socket;
  final Map<String, List<void Function(dynamic)>> _handlers = {};

  bool get connected => _socket?.connected ?? false;

  void connect(String baseUrl, String token) {
    disconnect();
    _socket = io.io(
      baseUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .disableAutoConnect()
          .setAuth({'token': token})
          .build(),
    );
    for (final entry in _handlers.entries) {
      for (final handler in entry.value) {
        _socket!.on(entry.key, handler);
      }
    }
    _socket!.connect();
  }

  void disconnect() {
    _socket?.dispose();
    _socket = null;
  }

  void on(String event, void Function(dynamic) handler) {
    _handlers.putIfAbsent(event, () => []).add(handler);
    _socket?.on(event, handler);
  }

  void off(String event, [void Function(dynamic)? handler]) {
    if (handler != null) {
      _handlers[event]?.remove(handler);
      _socket?.off(event, handler);
      return;
    }
    _handlers.remove(event);
    _socket?.off(event);
  }

  void emit(String event, [dynamic data]) {
    _socket?.emit(event, data);
  }

  void subscribeRide(String rideId) => emit('subscribeRide', rideId);
  void unsubscribeRide(String rideId) => emit('unsubscribeRide', rideId);
  void subscribeDriverFeed(String vehicleType) => emit('subscribeDriverFeed', vehicleType);
  void unsubscribeDriverFeed(String vehicleType) => emit('unsubscribeDriverFeed', vehicleType);

  void joinWebrtc(String rideId) => emit('webrtc:join', {'rideId': rideId});
  void leaveWebrtc(String rideId) => emit('webrtc:leave', {'rideId': rideId});
  void signalWebrtc(String rideId, Map<String, dynamic> data) =>
      emit('webrtc:signal', {'rideId': rideId, 'data': data});
  void sendTyping(String rideId, bool isTyping) =>
      emit('ride:typing', {'rideId': rideId, 'isTyping': isTyping});
}
