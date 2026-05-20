import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, setAuthToken } from "../../api/client";

const TOKEN_KEY = "ridehail_token";
/** Cached user JSON so cold start does not block on /auth/me (saves ~15s+ if API is slow or down). */
const USER_CACHE_KEY = "ridehail_user_cache";

async function persistUserCache(user) {
  if (user) await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
}

async function clearUserCache() {
  await AsyncStorage.removeItem(USER_CACHE_KEY);
}

async function readUserCache() {
  try {
    const raw = await AsyncStorage.getItem(USER_CACHE_KEY);
    if (!raw) return null;
    const u = JSON.parse(raw);
    return u && typeof u === "object" && u.role ? u : null;
  } catch {
    return null;
  }
}

function profileErrorMessage(e) {
  const d = e.response?.data;
  if (d && Array.isArray(d.errors) && d.errors.length) {
    return d.errors.map((x) => x.msg || x.message || String(x)).join(" · ");
  }
  return d?.message || e.message || "Request failed";
}

/** Refresh session from server; used after fast hydrate from cache. */
export const validateSessionThunk = createAsyncThunk("auth/validateSession", async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get("/auth/me");
    await persistUserCache(data.user);
    return data.user;
  } catch {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await clearUserCache();
    setAuthToken(null);
    return rejectWithValue(null);
  }
});

export const hydrateAuth = createAsyncThunk("auth/hydrate", async (_, { dispatch, rejectWithValue }) => {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) {
      setAuthToken(null);
      return { token: null, user: null };
    }
    setAuthToken(token);
    const cachedUser = await readUserCache();
    if (cachedUser) {
      setTimeout(() => {
        dispatch(validateSessionThunk());
      }, 0);
      return { token, user: cachedUser };
    }
    try {
      const { data } = await api.get("/auth/me");
      await persistUserCache(data.user);
      return { token, user: data.user };
    } catch {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await clearUserCache();
      setAuthToken(null);
      return { token: null, user: null };
    }
  } catch (e) {
    return rejectWithValue(String(e));
  }
});

export const googleSignInThunk = createAsyncThunk(
  "auth/google",
  async (idToken, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/auth/google", { idToken });
      await AsyncStorage.setItem(TOKEN_KEY, data.token);
      setAuthToken(data.token);
      await persistUserCache(data.user);
      return data;
    } catch (e) {
      return rejectWithValue(e.response?.data?.message || e.message);
    }
  }
);

export const phoneOtpRequestThunk = createAsyncThunk(
  "auth/phoneOtpRequest",
  async (phone, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/auth/phone/otp", { phone });
      return data;
    } catch (e) {
      return rejectWithValue(e.response?.data?.message || e.message);
    }
  }
);

export const phoneOtpVerifyThunk = createAsyncThunk(
  "auth/phoneOtpVerify",
  async ({ phone, otp, name }, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/auth/phone/verify", { phone, otp, name });
      await AsyncStorage.setItem(TOKEN_KEY, data.token);
      setAuthToken(data.token);
      await persistUserCache(data.user);
      return data;
    } catch (e) {
      return rejectWithValue(e.response?.data?.message || e.message);
    }
  }
);

export const loginThunk = createAsyncThunk(
  "auth/login",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      await AsyncStorage.setItem(TOKEN_KEY, data.token);
      setAuthToken(data.token);
      await persistUserCache(data.user);
      return data;
    } catch (e) {
      return rejectWithValue(e.response?.data?.message || e.message);
    }
  }
);

export const registerThunk = createAsyncThunk(
  "auth/register",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/auth/register", payload);
      await AsyncStorage.setItem(TOKEN_KEY, data.token);
      setAuthToken(data.token);
      await persistUserCache(data.user);
      return data;
    } catch (e) {
      return rejectWithValue(e.response?.data?.message || e.message);
    }
  }
);

export const logoutThunk = createAsyncThunk("auth/logout", async () => {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await clearUserCache();
  setAuthToken(null);
});

/** Replace session (e.g. after driver onboarding issues a new JWT with role=driver). */
export const applySessionThunk = createAsyncThunk("auth/applySession", async ({ token, user }, { rejectWithValue }) => {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    setAuthToken(token);
    await persistUserCache(user);
    return { token, user };
  } catch (e) {
    return rejectWithValue(String(e?.message || e));
  }
});

export const updateProfileThunk = createAsyncThunk(
  "auth/updateProfile",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.patch("/auth/profile", payload);
      await persistUserCache(data.user);
      return data.user;
    } catch (e) {
      return rejectWithValue(profileErrorMessage(e));
    }
  }
);

export const switchRoleThunk = createAsyncThunk(
  "auth/switchRole",
  async ({ role }, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/switch-role", { role });
      if (data?.token) {
        await AsyncStorage.setItem(TOKEN_KEY, data.token);
        setAuthToken(data.token);
      }
      if (data?.user) await persistUserCache(data.user);
      return data;
    } catch (e) {
      const d = e.response?.data;
      return rejectWithValue(d?.message || e.message || "Switch failed");
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: null,
    token: null,
    hydrated: false,
    loading: false,
    error: null,
  },
  reducers: {
    clearError(state) {
      state.error = null;
    },
    setUser(state, action) {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(hydrateAuth.pending, (state) => {
        state.hydrated = false;
      })
      .addCase(hydrateAuth.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.hydrated = true;
      })
      .addCase(hydrateAuth.rejected, (state) => {
        state.hydrated = true;
      })
      .addCase(googleSignInThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(googleSignInThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(googleSignInThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Google sign-in failed";
      })
      .addCase(phoneOtpRequestThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(phoneOtpRequestThunk.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(phoneOtpRequestThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to send code";
      })
      .addCase(phoneOtpVerifyThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(phoneOtpVerifyThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(phoneOtpVerifyThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Invalid code";
      })
      .addCase(loginThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Login failed";
      })
      .addCase(registerThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(registerThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Register failed";
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.user = null;
        state.token = null;
      })
      .addCase(updateProfileThunk.fulfilled, (state, action) => {
        state.user = action.payload;
        state.error = null;
      })
      .addCase(updateProfileThunk.rejected, (state, action) => {
        state.error = action.payload || "Update failed";
      })
      .addCase(validateSessionThunk.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(validateSessionThunk.rejected, (state) => {
        state.token = null;
        state.user = null;
      })
      .addCase(applySessionThunk.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.error = null;
      })
      .addCase(applySessionThunk.rejected, (state, action) => {
        state.error = action.payload || "Session update failed";
      })
      .addCase(switchRoleThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(switchRoleThunk.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload?.token) state.token = action.payload.token;
        if (action.payload?.user) state.user = action.payload.user;
      })
      .addCase(switchRoleThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Switch failed";
      });
  },
});

export const { clearError, setUser } = authSlice.actions;
export default authSlice.reducer;
