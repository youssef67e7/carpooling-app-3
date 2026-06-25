import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import '../api/api_endpoints.dart';

const _walletPageSize = 20;

class WalletPagination {
  const WalletPagination({
    required this.page,
    required this.total,
    required this.totalPages,
  });

  factory WalletPagination.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const WalletPagination(page: 1, total: 0, totalPages: 1);
    final total = (json['total'] as num?)?.toInt() ?? 0;
    return WalletPagination(
      page: (json['page'] as num?)?.toInt() ?? 1,
      total: total,
      totalPages: _walletPageSize > 0 ? (total + _walletPageSize - 1) ~/ _walletPageSize : 1,
    );
  }

  final int page;
  final int total;
  final int totalPages;

  bool get hasPrev => page > 1;
  bool get hasNext => page < totalPages;
}

class WalletState {
  const WalletState({
    this.accounts = const [],
    this.totalBalance = 0,
    this.transactions = const [],
    this.transactionsPagination = const WalletPagination(page: 1, total: 0, totalPages: 1),
    this.transactionsLoading = false,
    this.transactionsError,
    this.loading = false,
    this.error,
    this.lastWithdrawMeta,
  });

  final List<dynamic> accounts;
  final num totalBalance;
  final List<dynamic> transactions;
  final WalletPagination transactionsPagination;
  final bool transactionsLoading;
  final String? transactionsError;
  final bool loading;
  final String? error;
  final Map<String, dynamic>? lastWithdrawMeta;

  WalletState copyWith({
    List<dynamic>? accounts,
    num? totalBalance,
    List<dynamic>? transactions,
    WalletPagination? transactionsPagination,
    bool? transactionsLoading,
    String? transactionsError,
    bool clearTransactionsError = false,
    bool? loading,
    String? error,
    Map<String, dynamic>? lastWithdrawMeta,
  }) {
    return WalletState(
      accounts: accounts ?? this.accounts,
      totalBalance: totalBalance ?? this.totalBalance,
      transactions: transactions ?? this.transactions,
      transactionsPagination: transactionsPagination ?? this.transactionsPagination,
      transactionsLoading: transactionsLoading ?? this.transactionsLoading,
      transactionsError: clearTransactionsError ? null : (transactionsError ?? this.transactionsError),
      loading: loading ?? this.loading,
      error: error,
      lastWithdrawMeta: lastWithdrawMeta ?? this.lastWithdrawMeta,
    );
  }
}

class WalletNotifier extends StateNotifier<WalletState> {
  WalletNotifier(this._ref) : super(const WalletState());
  final Ref _ref;
  Future<ApiClient> get _api => _ref.read(apiClientProvider.future);

  Future<void> fetchAccounts() async {
    state = state.copyWith(loading: true);
    try {
      final api = await _api;
      final data = await api.getJson(ApiEndpoints.walletAccounts);
      state = state.copyWith(
        accounts: data['accounts'] as List? ?? [],
        totalBalance: data['totalBalance'] ?? 0,
        loading: false,
      );
    } catch (e) {
      state = state.copyWith(loading: false, error: e.toString());
    }
  }

  Future<void> fetchTransactions({int page = 1}) async {
    state = state.copyWith(transactionsLoading: true, clearTransactionsError: true);
    try {
      final api = await _api;
      final data = await api.getJson(ApiEndpoints.walletTransactions, query: {
        'page': page,
        'limit': _walletPageSize,
      });
      final nested = Map<String, dynamic>.from(data['data'] as Map? ?? {});
      state = state.copyWith(
        transactions: nested['items'] as List? ?? [],
        transactionsPagination: WalletPagination.fromJson(nested),
        transactionsLoading: false,
      );
    } catch (e) {
      state = state.copyWith(transactionsLoading: false, transactionsError: e.toString());
    }
  }

  Future<void> refresh() async {
    await fetchAccounts();
    await fetchTransactions();
  }

  Future<void> createAccount(String walletType, {String? phoneNumber, String? label}) async {
    state = state.copyWith(loading: true);
    try {
      final api = await _api;
      await api.postJson(ApiEndpoints.walletAccounts, {
        'walletType': walletType,
        if (phoneNumber != null) 'phoneNumber': phoneNumber,
        if (label != null) 'label': label,
      });
      await fetchAccounts();
    } catch (e) {
      state = state.copyWith(loading: false, error: e.toString());
      rethrow;
    }
  }

  Future<void> deleteAccount(String id) async {
    state = state.copyWith(loading: true);
    try {
      final api = await _api;
      await api.delete(ApiEndpoints.walletAccountDelete(id));
      await fetchAccounts();
    } catch (e) {
      state = state.copyWith(loading: false, error: e.toString());
      rethrow;
    }
  }

  Future<void> deposit(String walletAccountId, num amount) async {
    state = state.copyWith(loading: true);
    try {
      final api = await _api;
      await api.postJson(ApiEndpoints.walletDeposit, {'walletAccountId': walletAccountId, 'amount': amount});
      await fetchAccounts();
    } catch (e) {
      state = state.copyWith(loading: false, error: e.toString());
      rethrow;
    }
  }

  Future<Map<String, dynamic>> requestWithdraw(String walletAccountId, num amount) async {
    state = state.copyWith(loading: true);
    try {
      final api = await _api;
      final data = await api.postJson(ApiEndpoints.walletWithdrawRequest, {
        'walletAccountId': walletAccountId,
        'amount': amount,
      });
      state = state.copyWith(loading: false, lastWithdrawMeta: {'requestId': data['requestId'], 'expiresAt': data['expiresAt']});
      return data;
    } catch (e) {
      state = state.copyWith(loading: false, error: e.toString());
      rethrow;
    }
  }

  Future<void> confirmWithdraw(String requestId, String otp) async {
    state = state.copyWith(loading: true);
    try {
      final api = await _api;
      await api.postJson(ApiEndpoints.walletWithdrawConfirm, {'requestId': requestId, 'otp': otp});
      state = state.copyWith(loading: false, lastWithdrawMeta: null);
      await fetchAccounts();
    } catch (e) {
      state = state.copyWith(loading: false, error: e.toString());
      rethrow;
    }
  }

  void syncAccountsFromFirestore(List<Map<String, dynamic>> accounts) {
    final total = accounts.fold<num>(0, (sum, a) => sum + (num.tryParse('${a['balance']}') ?? 0));
    state = state.copyWith(
      accounts: accounts,
      totalBalance: total,
      loading: false,
    );
  }

  void syncTransactionsFromFirestore(List<Map<String, dynamic>> transactions) {
    state = state.copyWith(transactions: transactions);
  }

  void resetSession() => state = const WalletState();
}

final walletProvider = StateNotifierProvider<WalletNotifier, WalletState>((ref) => WalletNotifier(ref));
