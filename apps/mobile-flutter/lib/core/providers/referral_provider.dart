import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import '../api/api_endpoints.dart';

class ReferralState {
  const ReferralState({
    this.code,
    this.rewards = 0,
    this.referredUsers = const [],
    this.loading = false,
    this.error,
  });

  final String? code;
  final num rewards;
  final List<dynamic> referredUsers;
  final bool loading;
  final String? error;

  ReferralState copyWith({
    String? code,
    num? rewards,
    List<dynamic>? referredUsers,
    bool? loading,
    String? error,
    bool clearError = false,
  }) {
    return ReferralState(
      code: code ?? this.code,
      rewards: rewards ?? this.rewards,
      referredUsers: referredUsers ?? this.referredUsers,
      loading: loading ?? this.loading,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

class ReferralNotifier extends StateNotifier<ReferralState> {
  ReferralNotifier(this._ref) : super(const ReferralState());
  final Ref _ref;
  Future<ApiClient> get _api => _ref.read(apiClientProvider.future);

  Future<void> fetchMyCode() async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      final api = await _api;
      final res = await api.getJson('${ApiEndpoints.referrals}/my-code');
      final data = res['data'] as Map<String, dynamic>? ?? {};
      state = state.copyWith(loading: false, code: data['code'] as String?);
    } catch (e) {
      state = state.copyWith(loading: false, error: e.toString());
    }
  }

  Future<void> fetchRewards() async {
    try {
      final api = await _api;
      final res = await api.getJson('${ApiEndpoints.referrals}/rewards');
      final data = res['data'] as Map<String, dynamic>? ?? {};
      state = state.copyWith(
        rewards: (data['rewards'] as num?)?.toInt() ?? 0,
        referredUsers: data['referredUsers'] as List? ?? [],
      );
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<Map<String, dynamic>> apply(String code) async {
    try {
      final api = await _api;
      final res = await api.postJson('${ApiEndpoints.referrals}/apply', {'code': code});
      await fetchRewards();
      return (res['data'] as Map<String, dynamic>?) ?? {};
    } catch (e) {
      state = state.copyWith(error: e.toString());
      rethrow;
    }
  }
}

final referralProvider = StateNotifierProvider<ReferralNotifier, ReferralState>((ref) {
  return ReferralNotifier(ref);
});
