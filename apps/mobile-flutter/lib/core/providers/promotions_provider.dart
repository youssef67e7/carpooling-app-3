import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import '../api/api_endpoints.dart';

class PromoState {
  const PromoState({
    this.promos = const [],
    this.activePromos = const [],
    this.loading = false,
    this.error,
    this.validatedPromo,
    this.validatedDiscount = 0,
  });

  final List<dynamic> promos;
  final List<dynamic> activePromos;
  final bool loading;
  final String? error;
  final Map<String, dynamic>? validatedPromo;
  final num validatedDiscount;

  PromoState copyWith({
    List<dynamic>? promos,
    List<dynamic>? activePromos,
    bool? loading,
    String? error,
    bool clearError = false,
    Map<String, dynamic>? validatedPromo,
    num? validatedDiscount,
  }) {
    return PromoState(
      promos: promos ?? this.promos,
      activePromos: activePromos ?? this.activePromos,
      loading: loading ?? this.loading,
      error: clearError ? null : (error ?? this.error),
      validatedPromo: validatedPromo ?? this.validatedPromo,
      validatedDiscount: validatedDiscount ?? this.validatedDiscount,
    );
  }
}

class PromoNotifier extends StateNotifier<PromoState> {
  PromoNotifier(this._ref) : super(const PromoState());
  final Ref _ref;
  Future<ApiClient> get _api => _ref.read(apiClientProvider.future);

  Future<void> fetchActive() async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      final api = await _api;
      final res = await api.getJson('${ApiEndpoints.promotions}/active');
      state = state.copyWith(loading: false, activePromos: res['data'] as List? ?? []);
    } catch (e) {
      state = state.copyWith(loading: false, error: e.toString());
    }
  }

  Future<void> fetchAdmin() async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      final api = await _api;
      final res = await api.getJson('${ApiEndpoints.promotions}/admin');
      state = state.copyWith(loading: false, promos: res['data'] as List? ?? []);
    } catch (e) {
      state = state.copyWith(loading: false, error: e.toString());
    }
  }

  Future<Map<String, dynamic>> validate(String code, {num? rideFare}) async {
    try {
      final api = await _api;
      final res = await api.postJson('${ApiEndpoints.promotions}/validate', {
        'code': code,
        if (rideFare != null) 'rideFare': rideFare.toDouble(),
      });
      final data = res['data'] as Map<String, dynamic>? ?? {};
      state = state.copyWith(validatedPromo: data['promo'] as Map<String, dynamic>?, validatedDiscount: (data['discount'] as num?)?.toDouble() ?? 0);
      return data;
    } catch (e) {
      state = state.copyWith(error: e.toString());
      rethrow;
    }
  }

  Future<Map<String, dynamic>> apply(String id, num rideFare) async {
    try {
      final api = await _api;
      final res = await api.postJson('${ApiEndpoints.promotions}/apply/$id', {'rideFare': rideFare.toDouble()});
      return (res['data'] as Map<String, dynamic>?) ?? {};
    } catch (e) {
      state = state.copyWith(error: e.toString());
      rethrow;
    }
  }

  Future<void> create(Map<String, dynamic> promo) async {
    state = state.copyWith(loading: true);
    try {
      final api = await _api;
      await api.postJson('${ApiEndpoints.promotions}/create', promo);
      await fetchAdmin();
    } catch (e) {
      state = state.copyWith(loading: false, error: e.toString());
      rethrow;
    }
  }

  Future<void> toggle(String id) async {
    try {
      final api = await _api;
      await api.putJson('${ApiEndpoints.promotions}/admin/$id/toggle');
      await fetchAdmin();
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  void clearValidation() {
    state = state.copyWith(validatedPromo: null, validatedDiscount: 0);
  }
}

final promotionsProvider = StateNotifierProvider<PromoNotifier, PromoState>((ref) {
  return PromoNotifier(ref);
});
