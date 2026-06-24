class SocketService {
  bool get connected => false;

  void connect(String baseUrl, String token) {
    // Socket.io disabled - using REST polling
  }

  void disconnect() {
    // Socket.io disabled - using REST polling
  }

  void on(String event, void Function(dynamic) handler) {
    // Socket.io disabled - using REST polling
  }

  void off(String event, [void Function(dynamic)? handler]) {
    // Socket.io disabled - using REST polling
  }

  void emit(String event, [dynamic data]) {
    // Socket.io disabled - using REST polling
  }

  void subscribeRide(String rideId) {}
  void unsubscribeRide(String rideId) {}
  void subscribeDriverFeed(String vehicleType) {}
  void unsubscribeDriverFeed(String vehicleType) {}
  void joinWebrtc(String rideId) {}
  void leaveWebrtc(String rideId) {}
  void signalWebrtc(String rideId, Map<String, dynamic> data) {}
  void sendTyping(String rideId, bool isTyping) {}
}
