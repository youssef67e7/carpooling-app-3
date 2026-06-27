import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import '../api/api_endpoints.dart';

class PlaceState {
  const PlaceState({
    this.places = const [],
    this.loading = false,
    this.saving = false,
    this.error,
  });

  final List<dynamic> places;
  final bool loading;
  final bool saving;
  final String? error;

  PlaceState copyWith({
    List<dynamic>? places,
    bool? loading,
    bool? saving,
    String? error,
    bool clearError = false,
  }) {
    return PlaceState(
      places: places ?? this.places,
      loading: loading ?? this.loading,
      saving: saving ?? this.saving,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

class PlaceNotifier extends StateNotifier<PlaceState> {
  PlaceNotifier(this._ref) : super(const PlaceState());
  final Ref _ref;
  Future<ApiClient> get _api => _ref.read(apiClientProvider.future);

  Future<void> fetchPlaces() async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      final api = await _api;
      final data = await api.getJson(ApiEndpoints.places);
      state = state.copyWith(
        places: (data['data'] as List? ?? [])..sort((a, b) {
          final aDefault = (a['isDefault'] == true) ? 0 : 1;
          final bDefault = (b['isDefault'] == true) ? 0 : 1;
          final cmp = aDefault.compareTo(bDefault);
          if (cmp != 0) return cmp;
          return DateTime.parse(b['createdAt'] ?? '').compareTo(DateTime.parse(a['createdAt'] ?? ''));
        }),
        loading: false,
      );
    } catch (e) {
      state = state.copyWith(loading: false, error: e.toString());
    }
  }

  Future<void> createPlace(Map<String, dynamic> place) async {
    state = state.copyWith(saving: true);
    try {
      final api = await _api;
      await api.postJson(ApiEndpoints.places, place);
      await fetchPlaces();
    } catch (e) {
      state = state.copyWith(saving: false, error: e.toString());
      rethrow;
    }
  }

  Future<void> updatePlace(String id, Map<String, dynamic> updates) async {
    state = state.copyWith(saving: true);
    try {
      final api = await _api;
      await api.putJson(ApiEndpoints.place(id), updates);
      await fetchPlaces();
    } catch (e) {
      state = state.copyWith(saving: false, error: e.toString());
      rethrow;
    }
  }

  Future<void> deletePlace(String id) async {
    state = state.copyWith(saving: true);
    try {
      final api = await _api;
      await api.delete(ApiEndpoints.place(id));
      await fetchPlaces();
    } catch (e) {
      state = state.copyWith(saving: false, error: e.toString());
      rethrow;
    }
  }

  Future<void> setDefault(String id) async {
    state = state.copyWith(saving: true);
    try {
      final api = await _api;
      await api.putJson(ApiEndpoints.placeDefault(id));
      await fetchPlaces();
    } catch (e) {
      state = state.copyWith(saving: false, error: e.toString());
      rethrow;
    }
  }
}

final placesProvider = StateNotifierProvider<PlaceNotifier, PlaceState>((ref) {
  return PlaceNotifier(ref);
});
