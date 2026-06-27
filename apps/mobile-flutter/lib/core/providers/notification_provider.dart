import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import '../api/api_endpoints.dart';

class NotificationPrefsState {
  const NotificationPrefsState({
    this.loading = false,
    this.saving = false,
    this.prefs = const {},
    this.error,
  });

  final bool loading;
  final bool saving;
  final Map<String, dynamic> prefs;
  final String? error;

  NotificationPrefsState copyWith({
    bool? loading,
    bool? saving,
    Map<String, dynamic>? prefs,
    String? error,
    bool clearError = false,
  }) {
    return NotificationPrefsState(
      loading: loading ?? this.loading,
      saving: saving ?? this.saving,
      prefs: prefs ?? this.prefs,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

class NotificationPrefsNotifier extends StateNotifier<NotificationPrefsState> {
  NotificationPrefsNotifier(this._ref) : super(const NotificationPrefsState());
  final Ref _ref;
  Future<ApiClient> get _api => _ref.read(apiClientProvider.future);

  Future<void> fetch() async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      final api = await _api;
      final res = await api.getJson('${ApiEndpoints.prefs}/notifications');
      state = state.copyWith(loading: false, prefs: Map<String, dynamic>.from(res['data'] as Map? ?? {}));
    } catch (e) {
      state = state.copyWith(loading: false, error: e.toString());
    }
  }

  Future<void> update(String key, bool value) async {
    state = state.copyWith(saving: true);
    try {
      final api = await _api;
      final res = await api.putJson('${ApiEndpoints.prefs}/notifications', {key: value});
      state = state.copyWith(saving: false, prefs: Map<String, dynamic>.from(res['data'] as Map? ?? {}));
    } catch (e) {
      state = state.copyWith(saving: false, error: e.toString());
    }
  }
}

final notificationPrefsProvider = StateNotifierProvider<NotificationPrefsNotifier, NotificationPrefsState>((ref) {
  return NotificationPrefsNotifier(ref);
});
