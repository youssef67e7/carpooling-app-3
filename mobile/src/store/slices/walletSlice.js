import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "../../api/client";

function apiErrorMessage(e) {
  const d = e.response?.data;
  return d?.message || e.message || "Request failed";
}

export const fetchWalletAccounts = createAsyncThunk("wallet/accounts", async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get("/wallet/accounts");
    return { accounts: data.accounts || [], totalBalance: data.totalBalance ?? 0 };
  } catch (e) {
    return rejectWithValue(apiErrorMessage(e));
  }
});

export const createWalletAccount = createAsyncThunk(
  "wallet/accountCreate",
  async ({ walletType, phoneNumber, label }, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/wallet/accounts", { walletType, phoneNumber, label });
      return data.account;
    } catch (e) {
      return rejectWithValue(apiErrorMessage(e));
    }
  }
);

export const deleteWalletAccount = createAsyncThunk("wallet/accountDelete", async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/wallet/accounts/${id}`);
    return id;
  } catch (e) {
    return rejectWithValue(apiErrorMessage(e));
  }
});

export const depositWallet = createAsyncThunk(
  "wallet/deposit",
  async ({ walletAccountId, amount }, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/wallet/deposit", { walletAccountId, amount: Number(amount) });
      return data;
    } catch (e) {
      return rejectWithValue(apiErrorMessage(e));
    }
  }
);

export const requestWithdraw = createAsyncThunk(
  "wallet/withdrawRequest",
  async ({ walletAccountId, amount }, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/wallet/withdraw/request", {
        walletAccountId,
        amount: Number(amount),
      });
      return data;
    } catch (e) {
      return rejectWithValue(apiErrorMessage(e));
    }
  }
);

export const confirmWithdraw = createAsyncThunk(
  "wallet/withdrawConfirm",
  async ({ requestId, otp }, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/wallet/withdraw/confirm", { requestId, otp: String(otp) });
      return data;
    } catch (e) {
      return rejectWithValue(apiErrorMessage(e));
    }
  }
);

export const fetchWalletTransactions = createAsyncThunk("wallet/transactions", async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get("/wallet/transactions", { params: { limit: 60 } });
    return data.transactions || [];
  } catch (e) {
    return rejectWithValue(apiErrorMessage(e));
  }
});

const walletSlice = createSlice({
  name: "wallet",
  initialState: {
    accounts: [],
    totalBalance: 0,
    transactions: [],
    loading: false,
    error: null,
    lastWithdrawMeta: null,
  },
  reducers: {
    clearWalletError(state) {
      state.error = null;
    },
    clearWithdrawMeta(state) {
      state.lastWithdrawMeta = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWalletAccounts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWalletAccounts.fulfilled, (state, action) => {
        state.loading = false;
        state.accounts = action.payload.accounts;
        state.totalBalance = action.payload.totalBalance;
      })
      .addCase(fetchWalletAccounts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createWalletAccount.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.accounts = [action.payload, ...state.accounts.filter((a) => a._id !== action.payload._id)];
          state.totalBalance = state.accounts.reduce((s, a) => s + (Number(a.balance) || 0), 0);
        }
      })
      .addCase(deleteWalletAccount.fulfilled, (state, action) => {
        state.accounts = state.accounts.filter((a) => a._id !== action.payload);
      })
      .addCase(depositWallet.fulfilled, (state, action) => {
        const acc = action.payload?.account;
        if (acc?._id) {
          const i = state.accounts.findIndex((a) => a._id === acc._id);
          if (i >= 0) state.accounts[i] = acc;
          else state.accounts.push(acc);
        }
        state.totalBalance = state.accounts.reduce((s, a) => s + (Number(a.balance) || 0), 0);
      })
      .addCase(confirmWithdraw.fulfilled, (state, action) => {
        const acc = action.payload?.account;
        if (acc?._id) {
          const i = state.accounts.findIndex((a) => a._id === acc._id);
          if (i >= 0) state.accounts[i] = acc;
        }
        state.totalBalance = state.accounts.reduce((s, a) => s + (Number(a.balance) || 0), 0);
        state.lastWithdrawMeta = null;
      })
      .addCase(requestWithdraw.fulfilled, (state, action) => {
        state.lastWithdrawMeta = {
          requestId: action.payload.requestId,
          expiresAt: action.payload.expiresAt,
          devOtp: action.payload._devOtp,
        };
      })
      .addCase(fetchWalletTransactions.fulfilled, (state, action) => {
        state.transactions = action.payload;
      });
  },
});

export const { clearWalletError, clearWithdrawMeta } = walletSlice.actions;
export default walletSlice.reducer;
