import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import '../api/api_endpoints.dart';

class DriverState {
  const DriverState({
    this.status,
    this.dashboard,
    this.cars = const [],
    this.loading = false,
    this.error,
  });
  final Map<String, dynamic>? status;
  final Map<String, dynamic>? dashboard;
  final List<dynamic> cars;
  final bool loading;
  final String? error;

  Map<String, dynamic>? get stats => dashboard?['stats'] as Map<String, dynamic>?;
  Map<String, dynamic>? get verification => dashboard?['verification'] as Map<String, dynamic>?;

  DriverState copyWith({
    Map<String, dynamic>? status,
    Map<String, dynamic>? dashboard,
    List<dynamic>? cars,
    bool? loading,
    String? error,
    bool clearError = false,
  }) {
    return DriverState(
      status: status ?? this.status,
      dashboard: dashboard ?? this.dashboard,
      cars: cars ?? this.cars,
      loading: loading ?? this.loading,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

class DriverNotifier extends StateNotifier<DriverState> {
  DriverNotifier(this._ref) : super(const DriverState());
  final Ref _ref;
  Future<ApiClient> get _api => _ref.read(apiClientProvider.future);

  Future<void> refresh() async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      final api = await _api;
      final dashboard = Map<String, dynamic>.from(await api.getJson(ApiEndpoints.driverDashboard) as Map);
      final status = await api.getJson(ApiEndpoints.driverStatus);
      state = DriverState(
        dashboard: dashboard,
        status: Map<String, dynamic>.from(status as Map),
        cars: (status['cars'] as List?) ?? (dashboard['profile']?['cars'] as List?) ?? [],
        loading: false,
      );
    } catch (e) {
      try {
        final api = await _api;
        final status = await api.getJson(ApiEndpoints.driverStatus);
        state = DriverState(
          status: Map<String, dynamic>.from(status as Map),
          cars: status['cars'] as List<dynamic>? ?? [],
          loading: false,
        );
      } catch (e2) {
        state = state.copyWith(loading: false, error: e2.toString());
      }
    }
  }

  Future<Map<String, dynamic>> fetchDashboard() async {
    final api = await _api;
    final data = Map<String, dynamic>.from(await api.getJson(ApiEndpoints.driverDashboard) as Map);
    state = state.copyWith(dashboard: data);
    return data;
  }

  Future<Map<String, dynamic>> fetchEarningsSummary() async {
    final api = await _api;
    final data = await api.getJson(ApiEndpoints.driverEarningsSummary);
    return Map<String, dynamic>.from(data as Map);
  }

  Future<void> setActiveCar(String carId) async {
    final api = await _api;
    await api.patchJson(ApiEndpoints.driverCarSetActive(carId), {});
    await refresh();
  }

  Future<void> addCar(Map<String, dynamic> body) async {
    final api = await _api;
    await api.postJson(ApiEndpoints.driverCars, body);
    await refresh();
  }

  Future<void> toggleStatus() async {
    final api = await _api;
    await api.postJson(ApiEndpoints.driverToggleStatus, {});
    await refresh();
  }

  Future<void> updateLocation(double lat, double lng) async {
    final api = await _api;
    await api.postJson(ApiEndpoints.driverLocationUpdate, {'lat': lat, 'lng': lng});
  }

  Future<Map<String, dynamic>> fetchBonuses() async {
    final api = await _api;
    final data = await api.getJson(ApiEndpoints.driverBonuses);
    return Map<String, dynamic>.from(data as Map);
  }

  Future<Map<String, dynamic>> fetchBreakModeStatus() async {
    final api = await _api;
    final data = await api.getJson(ApiEndpoints.driverBreakMode);
    return Map<String, dynamic>.from(data as Map);
  }

  Future<Map<String, dynamic>> toggleBreakMode({int durationMinutes = 30}) async {
    final api = await _api;
    final data = await api.postJson(ApiEndpoints.driverBreakMode, {'durationMinutes': durationMinutes});
    return Map<String, dynamic>.from(data as Map);
  }
}

final driverProvider = StateNotifierProvider<DriverNotifier, DriverState>((ref) => DriverNotifier(ref));
