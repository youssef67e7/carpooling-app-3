import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import '../api/api_endpoints.dart';

class WalletState {
  const WalletState({
    this.accounts = const [],
    this.totalBalance = 0,
    this.transactions = const [],
    this.loading = false,
    this.error,
    this.lastWithdrawMeta,
  });

  final List<dynamic> accounts;
  final num totalBalance;
  final List<dynamic> transactions;
  final bool loading;
  final String? error;
  final Map<String, dynamic>? lastWithdrawMeta;

  WalletState copyWith({
    List<dynamic>? accounts,
    num? totalBalance,
    List<dynamic>? transactions,
    bool? loading,
    String? error,
    Map<String, dynamic>? lastWithdrawMeta,
  }) {
    return WalletState(
      accounts: accounts ?? this.accounts,
      totalBalance: totalBalance ?? this.totalBalance,
      transactions: transactions ?? this.transactions,
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
      state = WalletState(
        accounts: data['accounts'] as List? ?? [],
        totalBalance: data['totalBalance'] ?? 0,
        transactions: state.transactions,
        loading: false,
      );
    } catch (e) {
      state = state.copyWith(loading: false, error: e.toString());
    }
  }

  Future<void> fetchTransactions() async {
    final api = await _api;
    final data = await api.getJson(ApiEndpoints.walletTransactions, query: {'limit': 60});
    state = state.copyWith(transactions: data['transactions'] as List? ?? []);
  }

  Future<void> refresh() async {
    await fetchAccounts();
    await fetchTransactions();
  }

  Future<void> createAccount(String walletType, {String? phoneNumber, String? label}) async {
    final api = await _api;
    await api.postJson(ApiEndpoints.walletAccounts, {
      'walletType': walletType,
      if (phoneNumber != null) 'phoneNumber': phoneNumber,
      if (label != null) 'label': label,
    });
    await fetchAccounts();
  }

  Future<void> deleteAccount(String id) async {
    final api = await _api;
    await api.delete(ApiEndpoints.walletAccountDelete(id));
    await fetchAccounts();
  }

  Future<void> deposit(String walletAccountId, num amount) async {
    final api = await _api;
    await api.postJson(ApiEndpoints.walletDeposit, {'walletAccountId': walletAccountId, 'amount': amount});
    await fetchAccounts();
  }

  Future<Map<String, dynamic>> requestWithdraw(String walletAccountId, num amount) async {
    final api = await _api;
    final data = await api.postJson(ApiEndpoints.walletWithdrawRequest, {
      'walletAccountId': walletAccountId,
      'amount': amount,
    });
    state = state.copyWith(lastWithdrawMeta: {'requestId': data['requestId'], 'expiresAt': data['expiresAt']});
    return data;
  }

  Future<void> confirmWithdraw(String requestId, String otp) async {
    final api = await _api;
    await api.postJson(ApiEndpoints.walletWithdrawConfirm, {'requestId': requestId, 'otp': otp});
    state = state.copyWith(lastWithdrawMeta: null);
    await fetchAccounts();
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
