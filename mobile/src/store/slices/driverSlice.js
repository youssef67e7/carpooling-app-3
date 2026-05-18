import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "../../api/client";

function apiErrorMessage(e) {
  const d = e.response?.data;
  if (d && Array.isArray(d.errors) && d.errors.length) {
    return d.errors.map((x) => x.msg || x.message || String(x)).join(" · ");
  }
  return d?.message || e.message || "Request failed";
}

export const fetchDriverProfileThunk = createAsyncThunk("driver/profile", async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get("/driver-application/me");
    return data.profile || null;
  } catch (e) {
    return rejectWithValue(apiErrorMessage(e));
  }
});

export const fetchDriverStatusThunk = createAsyncThunk("driver/status", async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get("/driver/status");
    return data;
  } catch (e) {
    return rejectWithValue(apiErrorMessage(e));
  }
});

export const addDriverCarThunk = createAsyncThunk("driver/cars/add", async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post("/driver/cars", payload);
    return data.profile;
  } catch (e) {
    return rejectWithValue(apiErrorMessage(e));
  }
});

export const updateDriverCarThunk = createAsyncThunk(
  "driver/cars/update",
  async ({ carId, patch }, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(`/driver/cars/${carId}`, patch);
      return data.profile;
    } catch (e) {
      return rejectWithValue(apiErrorMessage(e));
    }
  }
);

export const deleteDriverCarThunk = createAsyncThunk("driver/cars/delete", async (carId, { rejectWithValue }) => {
  try {
    const { data } = await api.delete(`/driver/cars/${carId}`);
    return data.profile;
  } catch (e) {
    return rejectWithValue(apiErrorMessage(e));
  }
});

export const setActiveDriverCarThunk = createAsyncThunk("driver/cars/setActive", async (carId, { rejectWithValue }) => {
  try {
    const { data } = await api.patch(`/driver/cars/${carId}/set-active`);
    return data.profile;
  } catch (e) {
    return rejectWithValue(apiErrorMessage(e));
  }
});

const driverSlice = createSlice({
  name: "driver",
  initialState: {
    profile: null,
    status: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearDriverError(state) {
      state.error = null;
    },
    setDriverProfile(state, action) {
      state.profile = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDriverProfileThunk.fulfilled, (state, action) => {
        state.profile = action.payload;
        state.error = null;
      })
      .addCase(fetchDriverStatusThunk.fulfilled, (state, action) => {
        state.status = action.payload;
        state.error = null;
      })
      .addCase(addDriverCarThunk.fulfilled, (state, action) => {
        state.profile = action.payload;
      })
      .addCase(updateDriverCarThunk.fulfilled, (state, action) => {
        state.profile = action.payload;
      })
      .addCase(deleteDriverCarThunk.fulfilled, (state, action) => {
        state.profile = action.payload;
      })
      .addCase(setActiveDriverCarThunk.fulfilled, (state, action) => {
        state.profile = action.payload;
      })
      .addMatcher((a) => a.type.startsWith("driver/") && a.type.endsWith("/pending"), (state) => {
        state.loading = true;
        state.error = null;
      })
      .addMatcher((a) => a.type.startsWith("driver/") && a.type.endsWith("/fulfilled"), (state) => {
        state.loading = false;
      })
      .addMatcher((a) => a.type.startsWith("driver/") && a.type.endsWith("/rejected"), (state, action) => {
        state.loading = false;
        state.error = action.payload || "Error";
      });
  },
});

export const { clearDriverError, setDriverProfile } = driverSlice.actions;
export default driverSlice.reducer;

