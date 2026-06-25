import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import '../api/api_endpoints.dart';
import '../../shared/models/weret_user.dart';
import 'auth_provider.dart';
import 'wallet_provider.dart';

const kMaxDriverConcurrentRides = 2;

class RideState {
  const RideState({
    this.vehicles = const [],
    this.nearbyDrivers = const [],
    this.activeRides = const [],
    this.availableRides = const [],
    this.history = const [],
    this.adminUsers = const [],
    this.adminRides = const [],
    this.adminStats,
    this.driverRatings = const [],
    this.driverRatingSummary,
    this.driverAssignedCount = 0,
    this.driverMaxConcurrent = kMaxDriverConcurrentRides,
    this.driverCanTakeMore = true,
    this.loading = false,
    this.error,
  });

  final List<dynamic> vehicles;
  final List<dynamic> nearbyDrivers;
  final List<Map<String, dynamic>> activeRides;
  final List<dynamic> availableRides;
  final List<dynamic> history;
  final List<dynamic> adminUsers;
  final List<dynamic> adminRides;
  final Map<String, dynamic>? adminStats;
  final List<Map<String, dynamic>> driverRatings;
  final Map<String, dynamic>? driverRatingSummary;
  final int driverAssignedCount;
  final int driverMaxConcurrent;
  final bool driverCanTakeMore;
  final bool loading;
  final String? error;

  Map<String, dynamic>? get activeRide => activeRides.isNotEmpty ? activeRides.first : null;

  RideState copyWith({
    List<dynamic>? vehicles,
    List<dynamic>? nearbyDrivers,
    List<Map<String, dynamic>>? activeRides,
    List<dynamic>? availableRides,
    List<dynamic>? history,
    List<dynamic>? adminUsers,
    List<dynamic>? adminRides,
    Map<String, dynamic>? adminStats,
    List<Map<String, dynamic>>? driverRatings,
    Map<String, dynamic>? driverRatingSummary,
    int? driverAssignedCount,
    int? driverMaxConcurrent,
    bool? driverCanTakeMore,
    bool? loading,
    String? error,
    bool clearActiveRides = false,
  }) {
    return RideState(
      vehicles: vehicles ?? this.vehicles,
      nearbyDrivers: nearbyDrivers ?? this.nearbyDrivers,
      activeRides: clearActiveRides ? const [] : (activeRides ?? this.activeRides),
      availableRides: availableRides ?? this.availableRides,
      history: history ?? this.history,
      adminUsers: adminUsers ?? this.adminUsers,
      adminRides: adminRides ?? this.adminRides,
      adminStats: adminStats ?? this.adminStats,
      driverRatings: driverRatings ?? this.driverRatings,
      driverRatingSummary: driverRatingSummary ?? this.driverRatingSummary,
      driverAssignedCount: driverAssignedCount ?? this.driverAssignedCount,
      driverMaxConcurrent: driverMaxConcurrent ?? this.driverMaxConcurrent,
      driverCanTakeMore: driverCanTakeMore ?? this.driverCanTakeMore,
      loading: loading ?? this.loading,
      error: error,
    );
  }
}

class RideNotifier extends StateNotifier<RideState> {
  RideNotifier(this._ref) : super(const RideState());
  final Ref _ref;
  Future<ApiClient> get _api => _ref.read(apiClientProvider.future);

  bool get _isDriver => _ref.read(authProvider).user?.effectiveRole == 'driver';

  List<Map<String, dynamic>> _mergeActiveRide(Map<String, dynamic> ride, {List<Map<String, dynamic>>? base}) {
    final id = '${ride['_id']}';
    final status = '${ride['status']}';
    var list = [...(base ?? state.activeRides)];

    if (status == 'completed' || status == 'cancelled') {
      return list.where((r) => '${r['_id']}' != id).toList();
    }

    const driverActive = {'accepted', 'driver_arriving', 'passenger_onboard', 'ongoing'};
    if (_isDriver) {
      if (!driverActive.contains(status)) return list;
      final idx = list.indexWhere((r) => '${r['_id']}' == id);
      if (idx >= 0) {
        list[idx] = ride;
      } else if (list.length < kMaxDriverConcurrentRides) {
        list.add(ride);
      }
      list.sort((a, b) => '${a['acceptedAt'] ?? a['createdAt']}'.compareTo('${b['acceptedAt'] ?? b['createdAt']}'));
      return list.take(kMaxDriverConcurrentRides).toList();
    }

    if ({'pending', 'accepted', 'driver_arriving', 'passenger_onboard', 'ongoing'}.contains(status)) {
      return [ride];
    }
    return list;
  }

  void _applyActiveRides(List<Map<String, dynamic>> rides) {
    state = state.copyWith(
      activeRides: rides,
      driverAssignedCount: _isDriver ? rides.length : state.driverAssignedCount,
      driverCanTakeMore: _isDriver ? rides.length < kMaxDriverConcurrentRides : state.driverCanTakeMore,
    );
  }

  Future<void> fetchVehicles() async {
    state = state.copyWith(loading: true);
    try {
      final api = await _api;
      final data = await api.getJson(ApiEndpoints.vehicles);
      state = state.copyWith(vehicles: data['vehicles'] as List? ?? [], loading: false);
    } catch (e) {
      state = state.copyWith(loading: false, error: e.toString());
    }
  }

  Future<void> fetchNearbyDrivers(String vehicleType, {double? lat, double? lng, double radiusKm = 15}) async {
    final api = await _api;
    final query = <String, dynamic>{'vehicleType': vehicleType};
    if (lat != null && lng != null) {
      query['lat'] = lat;
      query['lng'] = lng;
      query['radiusKm'] = radiusKm;
    }
    final data = await api.getJson(ApiEndpoints.ridesNearbyDrivers, query: query);
    state = state.copyWith(nearbyDrivers: data['drivers'] as List? ?? []);
  }

  Future<Map<String, dynamic>?> fetchRoutePreview(double fromLat, double fromLng, double toLat, double toLng) async {
    try {
      final api = await _api;
      final data = await api.getJson(ApiEndpoints.ridesRoutePreview, query: {
        'fromLat': fromLat,
        'fromLng': fromLng,
        'toLat': toLat,
        'toLng': toLng,
      });
      return Map<String, dynamic>.from(data as Map);
    } catch (_) {
      return null;
    }
  }

  Future<Map<String, dynamic>> createRide(Map<String, dynamic> body) async {
    state = state.copyWith(loading: true, clearActiveRides: false);
    final api = await _api;
    debugPrint('📦 SENDING RIDE REQUEST: $body');
    try {
      final response = await api.postJson(ApiEndpoints.ridesCreate, body);
      debugPrint('✅ RIDE RESPONSE: $response');
      final ride = response['ride'] as Map<String, dynamic>;
      _applyActiveRides(_mergeActiveRide(ride));
      state = state.copyWith(loading: false);
      return ride;
    } catch (e) {
      debugPrint('❌ RIDE ERROR: $e');
      state = state.copyWith(loading: false, error: e.toString());
      rethrow;
    }
  }

  Future<void> fetchRideById(String id) async {
    final api = await _api;
    final response = await api.getJson(ApiEndpoints.rideStatus(id));
    final ride = response['data'] as Map<String, dynamic>?;
    if (ride != null) _applyActiveRides(_mergeActiveRide(ride));
  }

  final Map<String, String> _messageIdempotencyKeys = {};

  Future<List<dynamic>> fetchMessages(String rideId, {String? before}) async {
    final api = await _api;
    final params = <String, String>{};
    if (before != null) params['before'] = before;
    if (params.isNotEmpty) {
      final data = await api.getJson('${ApiEndpoints.rideMessages(rideId)}?${Uri(queryParameters: params).query}');
      return data['messages'] as List? ?? [];
    }
    final data = await api.getJson(ApiEndpoints.rideMessages(rideId));
    return data['messages'] as List? ?? [];
  }

  Future<void> sendMessage(String rideId, String text) async {
    final api = await _api;
    final key = '${rideId}_${DateTime.now().millisecondsSinceEpoch}_${text.hashCode}';
    _messageIdempotencyKeys[rideId] = key;
    await api.postJson(ApiEndpoints.rideMessages(rideId), {
      'text': text,
      'idempotencyKey': key,
    });
  }

  Future<void> fetchHistory() async {
    final api = await _api;
    final data = await api.getJson(ApiEndpoints.ridesHistory);
    final nested = data['data'] as Map? ?? {};
    final rides = (nested['items'] as List? ?? []).map((e) => Map<String, dynamic>.from(e as Map)).toList();
    final role = _ref.read(authProvider).user?.effectiveRole ?? 'passenger';
    syncUserRides(rides, activeRole: role);
  }

  Future<void> fetchDriverActiveRides() async {
    if (!_isDriver) return;
    final api = await _api;
    final data = await api.getJson(ApiEndpoints.ridesMyActive);
    final rides = (data['rides'] as List? ?? []).map((e) => Map<String, dynamic>.from(e as Map)).toList();
    final maxC = (data['maxConcurrent'] as num?)?.toInt() ?? kMaxDriverConcurrentRides;
    final count = (data['assignedCount'] as num?)?.toInt() ?? rides.length;
    state = state.copyWith(
      activeRides: rides,
      driverAssignedCount: count,
      driverMaxConcurrent: maxC,
      driverCanTakeMore: count < maxC,
    );
  }

  Future<void> refreshActiveRide() async {
    if (_isDriver) {
      await fetchDriverActiveRides();
      return;
    }
    final active = state.activeRide;
    final id = active != null ? '${active['_id']}' : null;
    if (id != null && id.isNotEmpty) {
      await fetchRideById(id);
      return;
    }
    await fetchHistory();
  }

  Future<void> fetchAvailable({String? vehicleType}) async {
    final api = await _api;
    final response = await api.getJson(ApiEndpoints.ridesAvailable);
    final rides = (response['rides'] as List? ?? []).map((e) => Map<String, dynamic>.from(e as Map)).toList();
    final count = (response['assignedCount'] as num?)?.toInt() ?? state.driverAssignedCount;
    final maxC = (response['maxConcurrent'] as num?)?.toInt() ?? kMaxDriverConcurrentRides;
    final more = response['canTakeMore'] as bool? ?? (count < maxC);
    state = state.copyWith(
      availableRides: rides,
      driverAssignedCount: count,
      driverMaxConcurrent: maxC,
      driverCanTakeMore: more,
    );
  }

  Future<Map<String, dynamic>> acceptRide(String rideId, {num? proposedFare}) async {
    final api = await _api;
    final driverId = _ref.read(authProvider).user?.id ?? '';
    final body = <String, dynamic>{'driverId': driverId};
    if (proposedFare != null) body['proposedFare'] = proposedFare;
    final response = await api.postJson(ApiEndpoints.ridesAccept(rideId), body);
    final ride = response['data'] as Map<String, dynamic>;
    _applyActiveRides(_mergeActiveRide(ride));
    await fetchAvailable();
    return ride;
  }

  Future<Map<String, dynamic>> respondProposal(String rideId, bool accept) async {
    final api = await _api;
    final data = await api.postJson(ApiEndpoints.ridesRespondProposal, {'rideId': rideId, 'accept': accept});
    final ride = data['ride'] as Map<String, dynamic>;
    _applyActiveRides(_mergeActiveRide(ride));
    return ride;
  }

  Future<Map<String, dynamic>> driverConfirmBooking(String rideId, bool accept) async {
    final api = await _api;
    final data = await api.postJson(ApiEndpoints.ridesDriverConfirmBooking, {'rideId': rideId, 'accept': accept});
    final ride = data['ride'] as Map<String, dynamic>;
    if (accept) {
      _applyActiveRides(_mergeActiveRide(ride));
    }
    await fetchAvailable();
    return ride;
  }

  Future<Map<String, dynamic>> driverArriving(String rideId) async {
    final api = await _api;
    final data = await api.postJson(ApiEndpoints.ridesArriving(rideId), {});
    final ride = data['data'] as Map<String, dynamic>;
    _applyActiveRides(_mergeActiveRide(ride));
    return ride;
  }

  Future<Map<String, dynamic>> passengerOnboard(String rideId) async {
    final api = await _api;
    final data = await api.postJson(ApiEndpoints.ridesOnboard(rideId), {});
    final ride = data['data'] as Map<String, dynamic>;
    _applyActiveRides(_mergeActiveRide(ride));
    return ride;
  }

  Future<Map<String, dynamic>> startRide(String rideId) async {
    final api = await _api;
    final data = await api.postJson(ApiEndpoints.ridesStart, {'rideId': rideId});
    final ride = data['ride'] as Map<String, dynamic>;
    _applyActiveRides(_mergeActiveRide(ride));
    return ride;
  }

  Future<Map<String, dynamic>> cancelRide(String rideId, {String? reason}) async {
    final api = await _api;
    final body = <String, dynamic>{};
    if (reason != null && reason.isNotEmpty) body['reason'] = reason;
    final data = await api.postJson(ApiEndpoints.ridesCancel(rideId), body);
    final ride = data['data'] as Map<String, dynamic>;
    _applyActiveRides(_mergeActiveRide(ride));
    _ref.read(walletProvider.notifier).refresh();
    fetchHistory();
    return ride;
  }

  Future<Map<String, dynamic>> driverCancelRide(String rideId, {String? reason}) async {
    final api = await _api;
    final body = <String, dynamic>{};
    if (reason != null && reason.isNotEmpty) body['reason'] = reason;
    final data = await api.postJson(ApiEndpoints.ridesDriverCancel(rideId), body);
    final ride = data['data'] as Map<String, dynamic>;
    _applyActiveRides(_mergeActiveRide(ride));
    _ref.read(walletProvider.notifier).refresh();
    fetchAvailable();
    fetchHistory();
    return ride;
  }

  Future<Map<String, dynamic>> endRide(String rideId) async {
    final api = await _api;
    final data = await api.postJson(ApiEndpoints.ridesEnd, {'rideId': rideId});
    final ride = data['ride'] as Map<String, dynamic>;
    _applyActiveRides(_mergeActiveRide(ride));
    await fetchAvailable();
    _ref.read(walletProvider.notifier).refresh();
    fetchHistory();
    return ride;
  }

  Future<void> rateRide(String rideId, int rating, {String? review}) async {
    final api = await _api;
    await api.postJson(ApiEndpoints.ridesRate, {'rideId': rideId, 'rating': rating, 'review': review ?? ''});
    await fetchHistory();
  }

  Future<void> fetchDriverRatings() async {
    final api = await _api;
    final data = await api.getJson(ApiEndpoints.ridesRatingsReceived);
    state = state.copyWith(
      driverRatings: (data['ratings'] as List? ?? []).map((e) => Map<String, dynamic>.from(e as Map)).toList(),
      driverRatingSummary: data['summary'] != null ? Map<String, dynamic>.from(data['summary'] as Map) : null,
    );
  }

  Future<void> toggleDriverOnline() async {
    final api = await _api;
    final data = await api.postJson(ApiEndpoints.driverToggleStatus, {});
    final token = _ref.read(authProvider).token;
    final userJson = data['user'];
    if (token != null && userJson is Map<String, dynamic>) {
      await _ref.read(authProvider.notifier).applySession(
            token: token,
            user: WeretUser.fromJson(userJson),
          );
    }
  }

  Future<void> updateDriverLocation(double lat, double lng) async {
    try {
      final api = await _api;
      await api.postJson(ApiEndpoints.driverLocationUpdate, {'lat': lat, 'lng': lng});
    } catch (e) {
      debugPrint('[RideProvider] updateDriverLocation error: $e');
    }
  }

  Future<void> updatePassengerLocation(double lat, double lng) async {
    final api = await _api;
    await api.postJson(ApiEndpoints.passengerLocationUpdate, {'lat': lat, 'lng': lng});
  }

  void handleRideUpdate(String? type, Map<String, dynamic> ride) {
    final id = '${ride['_id']}';
    final isTracked = state.activeRides.any((r) => '${r['_id']}' == id);
    final myId = _ref.read(authProvider).user?.id;
    final driverRef = ride['driverId'];
    final driverId = driverRef is Map ? '${driverRef['_id']}' : '$driverRef';
    final isAssignedToMe = _isDriver && driverId.isNotEmpty && driverId == myId;

    if (isTracked || isAssignedToMe || (!_isDriver && state.activeRides.isEmpty)) {
      _applyActiveRides(_mergeActiveRide(ride));
    }

    final terminal = type == 'ride.cancelled' ||
        type == 'ride.completed' ||
        type == 'ride.offerWithdrawn' ||
        type == 'ride.offerExpired' ||
        type == 'ride.offerRejected';

    final list = [...state.availableRides];
    final idx = list.indexWhere((r) => '${(r as Map)['_id']}' == id);

    if (terminal && idx >= 0) {
      list.removeAt(idx);
    } else if (idx >= 0) {
      list[idx] = ride;
    } else if (type == 'ride.created') {
      list.insert(0, ride);
    }

    state = state.copyWith(availableRides: list);
  }

  void applyDriverLocation(Map<String, dynamic> data) {
    final rideId = '${data['rideId'] ?? ''}';
    final loc = data['location'];
    if (rideId.isEmpty || loc is! Map) return;
    final list = state.activeRides.map((r) {
      if ('${r['_id']}' != rideId) return r;
      final updated = Map<String, dynamic>.from(r);
      final driver = updated['driverId'];
      if (driver is Map) {
        updated['driverId'] = Map<String, dynamic>.from(driver)..['location'] = loc;
      } else {
        updated['driverLiveLocation'] = loc;
      }
      return updated;
    }).toList();
    if (list.any((r) => '${r['_id']}' == rideId)) {
      _applyActiveRides(list);
    }
  }

  void syncVehicles(List<dynamic> vehicles) => state = state.copyWith(vehicles: vehicles, loading: false);

  void syncUserRides(List<Map<String, dynamic>> rides, {required String activeRole}) {
    const terminal = {'completed', 'cancelled'};
    const passengerActive = {'pending', 'accepted', 'driver_arriving', 'passenger_onboard', 'ongoing'};
    const driverActive = {'accepted', 'driver_arriving', 'passenger_onboard', 'ongoing'};
    final active = <Map<String, dynamic>>[];
    final history = <Map<String, dynamic>>[];
    final available = <Map<String, dynamic>>[];

    for (final r in rides) {
      final status = '${r['status']}';
      if (activeRole == 'driver') {
        if (driverActive.contains(status)) active.add(r);
      } else if (passengerActive.contains(status)) {
        active.add(r);
      }
      if (terminal.contains(status)) history.add(r);
      final driverId = r['driverId'] ?? r['driver_id'];
      if (activeRole == 'driver' && status == 'pending' && (driverId == null || '$driverId'.isEmpty)) {
        available.add(r);
      }
    }

    if (activeRole == 'driver') {
      active.sort((a, b) => '${a['acceptedAt'] ?? a['createdAt']}'.compareTo('${b['acceptedAt'] ?? b['createdAt']}'));
    }

    final activeSlice = activeRole == 'driver' ? active.take(kMaxDriverConcurrentRides).toList() : active.take(1).toList();

    state = state.copyWith(
      activeRides: activeSlice,
      history: history.take(50).toList(),
      availableRides: available,
      driverAssignedCount: activeRole == 'driver' ? activeSlice.length : state.driverAssignedCount,
      driverCanTakeMore: activeRole == 'driver' ? activeSlice.length < kMaxDriverConcurrentRides : state.driverCanTakeMore,
    );
  }

  void upsertRide(Map<String, dynamic> ride) => _applyActiveRides(_mergeActiveRide(ride));
  void upsertAvailableRides(List<dynamic> rides) => state = state.copyWith(availableRides: rides);
  void setActiveRide(Map<String, dynamic>? ride) => _applyActiveRides(ride != null ? _mergeActiveRide(ride, base: const []) : const []);

  Future<void> fetchAdminUsers() async {
    final api = await _api;
    final data = await api.getJson(ApiEndpoints.adminUsers);
    final nested = data['data'] as Map? ?? {};
    state = state.copyWith(adminUsers: nested['items'] as List? ?? []);
  }

  Future<void> fetchAdminRides() async {
    final api = await _api;
    final data = await api.getJson(ApiEndpoints.adminRides);
    final nested = data['data'] as Map? ?? {};
    state = state.copyWith(adminRides: nested['items'] as List? ?? []);
  }

  Future<void> fetchAdminStats() async {
    final api = await _api;
    final data = await api.getJson(ApiEndpoints.adminStats);
    state = state.copyWith(adminStats: data['stats'] as Map<String, dynamic>?);
  }

  Future<void> submitReport(Map<String, dynamic> body) async {
    final api = await _api;
    await api.postJson(ApiEndpoints.reports, body);
  }

  void resetSession() => state = const RideState();
}

final rideProvider = StateNotifierProvider<RideNotifier, RideState>((ref) => RideNotifier(ref));
