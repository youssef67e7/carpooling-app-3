import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import '../api/api_endpoints.dart';

const adminPageSize = 10;
const fixedAdminEmails = {'youssef@gmail.com', 'youssef1@gmail.com'};

class AdminPagination {
  const AdminPagination({
    required this.page,
    required this.limit,
    required this.total,
    required this.totalPages,
  });

  factory AdminPagination.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const AdminPagination(page: 1, limit: adminPageSize, total: 0, totalPages: 1);
    final total = (json['total'] as num?)?.toInt() ?? 0;
    final limit = (json['limit'] as num?)?.toInt() ?? adminPageSize;
    return AdminPagination(
      page: (json['page'] as num?)?.toInt() ?? 1,
      limit: limit,
      total: total,
      totalPages: limit > 0 ? (total + limit - 1) ~/ limit : 1,
    );
  }

  final int page;
  final int limit;
  final int total;
  final int totalPages;

  bool get hasPrev => page > 1;
  bool get hasNext => page < totalPages;
}

class AdminListSlice {
  const AdminListSlice({
    this.items = const [],
    this.pagination = const AdminPagination(page: 1, limit: adminPageSize, total: 0, totalPages: 1),
    this.search = '',
    this.loading = false,
    this.error,
  });

  final List<Map<String, dynamic>> items;
  final AdminPagination pagination;
  final String search;
  final bool loading;
  final String? error;

  AdminListSlice copyWith({
    List<Map<String, dynamic>>? items,
    AdminPagination? pagination,
    String? search,
    bool? loading,
    String? error,
    bool clearError = false,
  }) {
    return AdminListSlice(
      items: items ?? this.items,
      pagination: pagination ?? this.pagination,
      search: search ?? this.search,
      loading: loading ?? this.loading,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

class AdminState {
  const AdminState({
    this.stats,
    this.statsLoading = false,
    this.statsError,
    this.users = const AdminListSlice(),
    this.rides = const AdminListSlice(),
    this.reports = const AdminListSlice(),
    this.transactions = const AdminListSlice(),
    this.audit = const AdminListSlice(),
  });

  final Map<String, dynamic>? stats;
  final bool statsLoading;
  final String? statsError;
  final AdminListSlice users;
  final AdminListSlice rides;
  final AdminListSlice reports;
  final AdminListSlice transactions;
  final AdminListSlice audit;

  AdminState copyWith({
    Map<String, dynamic>? stats,
    bool? statsLoading,
    String? statsError,
    bool clearStatsError = false,
    AdminListSlice? users,
    AdminListSlice? rides,
    AdminListSlice? reports,
    AdminListSlice? transactions,
    AdminListSlice? audit,
  }) {
    return AdminState(
      stats: stats ?? this.stats,
      statsLoading: statsLoading ?? this.statsLoading,
      statsError: clearStatsError ? null : (statsError ?? this.statsError),
      users: users ?? this.users,
      rides: rides ?? this.rides,
      reports: reports ?? this.reports,
      transactions: transactions ?? this.transactions,
      audit: audit ?? this.audit,
    );
  }
}

class AdminNotifier extends StateNotifier<AdminState> {
  AdminNotifier(this.ref) : super(const AdminState());

  final Ref ref;

  Future<ApiClient> get _api async => ref.read(apiClientProvider.future);

  String _messageFromError(Object e) {
    if (e is DioException) {
      final data = e.response?.data;
      if (data is Map && data['message'] != null) return '${data['message']}';
      return e.message ?? e.toString();
    }
    return e.toString();
  }

  Future<void> fetchStats() async {
    state = state.copyWith(statsLoading: true, clearStatsError: true);
    try {
      final api = await _api;
      final data = await api.getJson(ApiEndpoints.adminStats);
      state = state.copyWith(stats: data['stats'] as Map<String, dynamic>?, statsLoading: false);
    } catch (e) {
      state = state.copyWith(statsLoading: false, statsError: _messageFromError(e));
    }
  }

  Future<void> fetchUsers({int? page, String? search}) async {
    final nextPage = page ?? state.users.pagination.page;
    final nextSearch = search ?? state.users.search;
    state = state.copyWith(users: state.users.copyWith(loading: true, clearError: true, search: nextSearch));
    try {
      final api = await _api;
      final data = await api.getJson(ApiEndpoints.adminUsers, query: {
        'page': nextPage,
        'limit': adminPageSize,
        if (nextSearch.trim().isNotEmpty) 'search': nextSearch.trim(),
      });
      final nested = data['data'] as Map<String, dynamic>? ?? {};
      state = state.copyWith(
        users: AdminListSlice(
          items: _mapList(nested['items']),
          pagination: AdminPagination.fromJson(nested),
          search: nextSearch,
          loading: false,
        ),
      );
    } catch (e) {
      state = state.copyWith(users: state.users.copyWith(loading: false, error: _messageFromError(e)));
    }
  }

  Future<void> fetchRides({int? page, String? search}) async {
    final nextPage = page ?? state.rides.pagination.page;
    final nextSearch = search ?? state.rides.search;
    state = state.copyWith(rides: state.rides.copyWith(loading: true, clearError: true, search: nextSearch));
    try {
      final api = await _api;
      final data = await api.getJson(ApiEndpoints.adminRides, query: {
        'page': nextPage,
        'limit': adminPageSize,
        if (nextSearch.trim().isNotEmpty) 'search': nextSearch.trim(),
      });
      final nested = data['data'] as Map<String, dynamic>? ?? {};
      state = state.copyWith(
        rides: AdminListSlice(
          items: _mapList(nested['items']),
          pagination: AdminPagination.fromJson(nested),
          search: nextSearch,
          loading: false,
        ),
      );
    } catch (e) {
      state = state.copyWith(rides: state.rides.copyWith(loading: false, error: _messageFromError(e)));
    }
  }

  Future<void> fetchReports({int? page, String? search}) async {
    final nextPage = page ?? state.reports.pagination.page;
    final nextSearch = search ?? state.reports.search;
    state = state.copyWith(reports: state.reports.copyWith(loading: true, clearError: true, search: nextSearch));
    try {
      final api = await _api;
      final data = await api.getJson(ApiEndpoints.adminReports, query: {
        'page': nextPage,
        'limit': adminPageSize,
        if (nextSearch.trim().isNotEmpty) 'search': nextSearch.trim(),
      });
      final nested = data['data'] as Map<String, dynamic>? ?? {};
      state = state.copyWith(
        reports: AdminListSlice(
          items: _mapList(nested['items']),
          pagination: AdminPagination.fromJson(nested),
          search: nextSearch,
          loading: false,
        ),
      );
    } catch (e) {
      state = state.copyWith(reports: state.reports.copyWith(loading: false, error: _messageFromError(e)));
    }
  }

  Future<void> fetchTransactions({int? page, String? search}) async {
    final nextPage = page ?? state.transactions.pagination.page;
    final nextSearch = search ?? state.transactions.search;
    state = state.copyWith(transactions: state.transactions.copyWith(loading: true, clearError: true, search: nextSearch));
    try {
      final api = await _api;
      final data = await api.getJson(ApiEndpoints.adminTransactions, query: {
        'page': nextPage,
        'limit': adminPageSize,
        if (nextSearch.trim().isNotEmpty) 'search': nextSearch.trim(),
      });
      final nested = data['data'] as Map<String, dynamic>? ?? {};
      state = state.copyWith(
        transactions: AdminListSlice(
          items: _mapList(nested['items']),
          pagination: AdminPagination.fromJson(nested),
          search: nextSearch,
          loading: false,
        ),
      );
    } catch (e) {
      state = state.copyWith(transactions: state.transactions.copyWith(loading: false, error: _messageFromError(e)));
    }
  }

  Future<void> fetchAudit({int? page, String? search}) async {
    final nextPage = page ?? state.audit.pagination.page;
    final nextSearch = search ?? state.audit.search;
    state = state.copyWith(audit: state.audit.copyWith(loading: true, clearError: true, search: nextSearch));
    try {
      final api = await _api;
      final data = await api.getJson(ApiEndpoints.adminAudit, query: {
        'page': nextPage,
        'limit': adminPageSize,
        if (nextSearch.trim().isNotEmpty) 'search': nextSearch.trim(),
      });
      final nested = data['data'] as Map<String, dynamic>? ?? {};
      state = state.copyWith(
        audit: AdminListSlice(
          items: _mapList(nested['items']),
          pagination: AdminPagination.fromJson(nested),
          search: nextSearch,
          loading: false,
        ),
      );
    } catch (e) {
      state = state.copyWith(audit: state.audit.copyWith(loading: false, error: _messageFromError(e)));
    }
  }

  Future<String?> patchUser(String id, Map<String, dynamic> body) async {
    try {
      final api = await _api;
      await api.patchJson(ApiEndpoints.adminUser(id), body);
      await fetchUsers(page: state.users.pagination.page);
      return null;
    } catch (e) {
      return _messageFromError(e);
    }
  }

  Future<String?> deleteUser(String id) async {
    try {
      final api = await _api;
      await api.delete(ApiEndpoints.adminUser(id));
      await fetchUsers(page: state.users.pagination.page);
      return null;
    } catch (e) {
      return _messageFromError(e);
    }
  }

  Future<String?> updateReportStatus(String id, String status) async {
    try {
      final api = await _api;
      await api.patchJson(ApiEndpoints.adminReport(id), {'status': status});
      await fetchReports(page: state.reports.pagination.page);
      return null;
    } catch (e) {
      return _messageFromError(e);
    }
  }

  Future<String?> setTransactionFlag(String id, {required bool flagged, String? reason}) async {
    try {
      final api = await _api;
      await api.patchJson(ApiEndpoints.adminTransactionFlag(id), {
        'flagged': flagged,
        if (reason != null) 'flaggedReason': reason,
      });
      await fetchTransactions(page: state.transactions.pagination.page);
      return null;
    } catch (e) {
      return _messageFromError(e);
    }
  }

  List<Map<String, dynamic>> _mapList(dynamic raw) {
    if (raw is! List) return const [];
    return raw.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  /// Merge refreshed counts into cached dashboard stats (used by live sync).
  void mergeStats(Map<String, dynamic> patch) {
    final prev = state.stats ?? {};
    state = state.copyWith(stats: {...prev, ...patch});
  }
}

bool isFixedAdminEmail(String email) => fixedAdminEmails.contains(email.trim().toLowerCase());

bool userIsBlocked(Map<String, dynamic> u) => u['is_blocked'] == true || u['isBlocked'] == true;

bool userIsVerified(Map<String, dynamic> u) =>
    u['is_verified'] == true || u['isVerified'] == true || u['idVerified'] == true;

String userDriverApplicationStatus(Map<String, dynamic> u) =>
    '${u['driver_application_status'] ?? u['driverApplicationStatus'] ?? 'none'}';

final adminProvider = StateNotifierProvider<AdminNotifier, AdminState>((ref) => AdminNotifier(ref));
