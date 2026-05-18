import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "../../api/client";

function apiErrorMessage(e) {
  const d = e.response?.data;
  if (d && Array.isArray(d.errors) && d.errors.length) {
    return d.errors.map((x) => x.msg || x.message || String(x)).join(" · ");
  }
  return d?.message || e.message || "Request failed";
}

export const fetchVehiclesThunk = createAsyncThunk("ride/vehicles", async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get("/vehicles");
    return data.vehicles || [];
  } catch (e) {
    return rejectWithValue(apiErrorMessage(e));
  }
});

export const fetchNearbyDrivers = createAsyncThunk(
  "ride/fetchNearbyDrivers",
  async (vehicleType = "delivery", { rejectWithValue }) => {
    try {
      const vt = typeof vehicleType === "string" && vehicleType.trim() ? vehicleType.trim() : "delivery";
      const { data } = await api.get("/rides/nearby-drivers", { params: { vehicleType: vt } });
      return { drivers: data.drivers || [], vehicleType: data.vehicleType || vt };
    } catch (e) {
      return rejectWithValue(apiErrorMessage(e));
    }
  }
);

export const createRideThunk = createAsyncThunk(
  "ride/create",
  async (
    {
      pickupLocation,
      destinationLocation,
      vehicleType,
      passengerMinFare,
      passengerCount,
      passengerSize,
      parcel,
    },
    { rejectWithValue }
  ) => {
    try {
      const body = {
        vehicleType: String(vehicleType || "delivery").toLowerCase().trim(),
        pickupLocation: {
          lat: Number(pickupLocation.lat),
          lng: Number(pickupLocation.lng),
        },
        destinationLocation: {
          lat: Number(destinationLocation.lat),
          lng: Number(destinationLocation.lng),
        },
      };
      if (parcel && typeof parcel === "object") {
        const p = {};
        if (parcel.description != null && String(parcel.description).trim()) {
          p.description = String(parcel.description).trim();
        }
        if (parcel.receiverName != null && String(parcel.receiverName).trim()) {
          p.receiverName = String(parcel.receiverName).trim();
        }
        if (parcel.receiverPhone != null && String(parcel.receiverPhone).trim()) {
          p.receiverPhone = String(parcel.receiverPhone).trim();
        }
        if (parcel.notes != null && String(parcel.notes).trim()) {
          p.notes = String(parcel.notes).trim();
        }
        if (parcel.deliverBy != null && String(parcel.deliverBy).trim()) {
          p.deliverBy = String(parcel.deliverBy).trim();
        }
        if (Object.keys(p).length) body.parcel = p;
      }
      if (passengerMinFare != null && passengerMinFare !== "") {
        body.passengerMinFare = Number(passengerMinFare);
      }
      if (passengerCount != null) {
        body.passengerCount = Math.min(8, Math.max(1, Number(passengerCount) || 1));
      }
      if (passengerSize) {
        body.passengerSize = String(passengerSize).toUpperCase();
      }
      const { data } = await api.post("/rides/create", body);
      return data.ride;
    } catch (e) {
      return rejectWithValue(apiErrorMessage(e));
    }
  }
);

export const fetchRideById = createAsyncThunk(
  "ride/fetchById",
  async (rideId, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/rides/${rideId}`);
      return data.ride;
    } catch (e) {
      return rejectWithValue(apiErrorMessage(e));
    }
  }
);

export const fetchRideMessagesThunk = createAsyncThunk(
  "ride/messages/fetch",
  async (rideId, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/rides/${rideId}/messages`);
      return { rideId, messages: data.messages || [] };
    } catch (e) {
      return rejectWithValue(apiErrorMessage(e));
    }
  }
);

export const sendRideMessageThunk = createAsyncThunk(
  "ride/messages/send",
  async ({ rideId, text }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/rides/${rideId}/messages`, { text });
      return data.message;
    } catch (e) {
      return rejectWithValue(apiErrorMessage(e));
    }
  }
);

export const fetchHistory = createAsyncThunk("ride/history", async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get("/rides/history");
    return data.rides;
  } catch (e) {
    return rejectWithValue(apiErrorMessage(e));
  }
});

export const fetchAvailableRides = createAsyncThunk(
  "ride/available",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/rides/available");
      return data.rides;
    } catch (e) {
      return rejectWithValue(apiErrorMessage(e));
    }
  }
);

export const acceptRideThunk = createAsyncThunk(
  "ride/accept",
  async ({ rideId, proposedFare }, { rejectWithValue }) => {
    try {
      const body = { rideId };
      if (proposedFare != null && proposedFare !== "") {
        body.proposedFare = Number(proposedFare);
      }
      const { data } = await api.post("/rides/accept", body);
      return data.ride;
    } catch (e) {
      return rejectWithValue(apiErrorMessage(e));
    }
  }
);

export const respondDriverProposalThunk = createAsyncThunk(
  "ride/respondProposal",
  async ({ rideId, accept }, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/rides/respond-proposal", { rideId, accept });
      return data.ride;
    } catch (e) {
      return rejectWithValue(apiErrorMessage(e));
    }
  }
);

export const updatePassengerMinFareThunk = createAsyncThunk(
  "ride/passengerMinFare",
  async ({ rideId, passengerMinFare }, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/rides/passenger-min-fare", { rideId, passengerMinFare });
      return data.ride;
    } catch (e) {
      return rejectWithValue(apiErrorMessage(e));
    }
  }
);

export const driverConfirmBookingThunk = createAsyncThunk(
  "ride/driverConfirmBooking",
  async ({ rideId, accept }, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/rides/driver-confirm-booking", { rideId, accept });
      return data.ride;
    } catch (e) {
      return rejectWithValue(apiErrorMessage(e));
    }
  }
);

export const withdrawOfferThunk = createAsyncThunk(
  "ride/withdrawOffer",
  async ({ rideId }, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/rides/withdraw-offer", { rideId });
      return data.ride;
    } catch (e) {
      return rejectWithValue(apiErrorMessage(e));
    }
  }
);

export const driverCancelRideThunk = createAsyncThunk(
  "ride/driverCancel",
  async ({ rideId, reason }, { rejectWithValue }) => {
    try {
      const body = { rideId };
      if (reason != null && String(reason).trim()) body.reason = String(reason).trim();
      const { data } = await api.post("/rides/driver-cancel", body);
      return data.ride;
    } catch (e) {
      return rejectWithValue(apiErrorMessage(e));
    }
  }
);

export const startRideThunk = createAsyncThunk(
  "ride/start",
  async (rideId, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/rides/start", { rideId });
      return data.ride;
    } catch (e) {
      return rejectWithValue(apiErrorMessage(e));
    }
  }
);

export const endRideThunk = createAsyncThunk(
  "ride/end",
  async (rideId, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/rides/end", { rideId });
      return data.ride;
    } catch (e) {
      return rejectWithValue(apiErrorMessage(e));
    }
  }
);

export const rateRideThunk = createAsyncThunk(
  "ride/rate",
  async ({ rideId, rating, review }, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/rides/rate", { rideId, rating, review: review ?? "" });
      return data.ride;
    } catch (e) {
      return rejectWithValue(apiErrorMessage(e));
    }
  }
);

export const toggleDriverOnlineThunk = createAsyncThunk(
  "ride/toggleDriver",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/driver/toggle-status");
      return data;
    } catch (e) {
      return rejectWithValue(apiErrorMessage(e));
    }
  }
);

export const updateDriverLocationThunk = createAsyncThunk(
  "ride/driverLocation",
  async ({ lat, lng }, { rejectWithValue }) => {
    try {
      await api.post("/driver/location-update", { lat, lng });
      return { lat, lng };
    } catch (e) {
      return rejectWithValue(apiErrorMessage(e));
    }
  }
);

export const updatePassengerLocationThunk = createAsyncThunk(
  "ride/passengerLocation",
  async ({ lat, lng }, { rejectWithValue }) => {
    try {
      await api.post("/passenger/location-update", { lat, lng });
      return { lat, lng };
    } catch (e) {
      return rejectWithValue(apiErrorMessage(e));
    }
  }
);

export const fetchAdminUsers = createAsyncThunk("admin/users", async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get("/admin/users");
    return data.users;
  } catch (e) {
    return rejectWithValue(apiErrorMessage(e));
  }
});

export const fetchAdminRides = createAsyncThunk("admin/rides", async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get("/admin/rides");
    return data.rides;
  } catch (e) {
    return rejectWithValue(apiErrorMessage(e));
  }
});

export const fetchAdminStats = createAsyncThunk("admin/stats", async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get("/admin/stats");
    return data.stats;
  } catch (e) {
    return rejectWithValue(apiErrorMessage(e));
  }
});

export const updateAdminUserThunk = createAsyncThunk(
  "admin/updateUser",
  async ({ userId, ...patch }, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(`/admin/users/${userId}`, patch);
      return data.user;
    } catch (e) {
      return rejectWithValue(apiErrorMessage(e));
    }
  }
);

export const deleteAdminUserThunk = createAsyncThunk("admin/deleteUser", async (userId, { rejectWithValue }) => {
  try {
    await api.delete(`/admin/users/${userId}`);
    return userId;
  } catch (e) {
    return rejectWithValue(apiErrorMessage(e));
  }
});

export const fetchAdminReports = createAsyncThunk("admin/reports", async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get("/admin/reports");
    return data.reports || [];
  } catch (e) {
    return rejectWithValue(apiErrorMessage(e));
  }
});

export const updateAdminReportThunk = createAsyncThunk(
  "admin/reportPatch",
  async ({ id, status, adminNote }, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(`/admin/reports/${id}`, { status, adminNote });
      return data.report;
    } catch (e) {
      return rejectWithValue(apiErrorMessage(e));
    }
  }
);

export const fetchAdminTransactions = createAsyncThunk("admin/transactions", async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get("/admin/transactions", { params: { limit: 100 } });
    return data.transactions || [];
  } catch (e) {
    return rejectWithValue(apiErrorMessage(e));
  }
});

export const fetchAdminAuditLogs = createAsyncThunk("admin/audit", async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get("/admin/audit", { params: { limit: 120 } });
    return data.logs || [];
  } catch (e) {
    return rejectWithValue(apiErrorMessage(e));
  }
});

export const flagAdminTransactionThunk = createAsyncThunk(
  "admin/txFlag",
  async ({ id, flagged, flaggedReason }, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(`/admin/transactions/${id}/flag`, { flagged, flaggedReason });
      return data.transaction;
    } catch (e) {
      return rejectWithValue(apiErrorMessage(e));
    }
  }
);

export const submitReportThunk = createAsyncThunk(
  "reports/submit",
  async ({ reportedUserId, reason, description, rideId }, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/reports", { reportedUserId, reason, description, rideId });
      return data.report;
    } catch (e) {
      return rejectWithValue(apiErrorMessage(e));
    }
  }
);

const rideSlice = createSlice({
  name: "ride",
  initialState: {
    vehicles: [],
    nearbyDrivers: [],
    activeRide: null,
    availableRides: [],
    history: [],
    adminUsers: [],
    adminRides: [],
    adminStats: null,
    adminReports: [],
    adminTransactions: [],
    adminAuditLogs: [],
    loading: false,
    error: null,
    lastPollAt: null,
  },
  reducers: {
    clearRideError(state) {
      state.error = null;
    },
    setActiveRide(state, action) {
      state.activeRide = action.payload;
    },
    upsertRide(state, action) {
      const ride = action.payload;
      if (!ride?._id) return;
      // keep active ride in sync
      if (state.activeRide?._id === ride._id) {
        state.activeRide = ride;
      }

      // update available list if present
      if (Array.isArray(state.availableRides)) {
        const idx = state.availableRides.findIndex((r) => r?._id === ride._id);
        if (idx >= 0) {
          // If this ride is no longer "available", remove it from the driver's list.
          if (ride.status !== "pending" || ride.driverId || ride.status === "cancelled") {
            state.availableRides.splice(idx, 1);
          } else {
            state.availableRides[idx] = ride;
          }
        }
      }
      // update history list if present
      if (Array.isArray(state.history)) {
        const idx = state.history.findIndex((r) => r?._id === ride._id);
        if (idx >= 0) state.history[idx] = ride;
      }
    },
    setActiveRideId(state, action) {
      const id = action.payload;
      if (!id) return;
      if (state.activeRide?._id === id) return;
      // try to reuse existing copy from available/history to avoid mismatched shapes
      const fromAvail = Array.isArray(state.availableRides) ? state.availableRides.find((r) => r?._id === id) : null;
      const fromHist = Array.isArray(state.history) ? state.history.find((r) => r?._id === id) : null;
      state.activeRide = fromAvail || fromHist || { _id: id };
    },
    upsertAvailableRides(state, action) {
      const list = Array.isArray(action.payload) ? action.payload : [];
      state.availableRides = list;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVehiclesThunk.fulfilled, (state, action) => {
        state.vehicles = action.payload || [];
      })
      .addCase(fetchNearbyDrivers.fulfilled, (state, action) => {
        const p = action.payload;
        state.nearbyDrivers = Array.isArray(p) ? p : p?.drivers ?? [];
        state.lastPollAt = Date.now();
      })
      .addCase(createRideThunk.fulfilled, (state, action) => {
        const ride = action.payload;
        state.activeRide = ride;
        rideSlice.caseReducers.upsertRide(state, { payload: ride });
        state.error = null;
      })
      .addCase(fetchRideById.fulfilled, (state, action) => {
        const ride = action.payload;
        state.activeRide = ride;
        rideSlice.caseReducers.upsertRide(state, { payload: ride });
        state.lastPollAt = Date.now();
      })
      .addCase(fetchHistory.fulfilled, (state, action) => {
        const list = action.payload || [];
        state.history = list;
        // keep active/available copies consistent if ids match
        for (const r of list) {
          if (r?._id) rideSlice.caseReducers.upsertRide(state, { payload: r });
        }
      })
      .addCase(fetchAvailableRides.fulfilled, (state, action) => {
        const list = action.payload || [];
        state.availableRides = list;
        for (const r of list) {
          if (r?._id) rideSlice.caseReducers.upsertRide(state, { payload: r });
        }
        state.lastPollAt = Date.now();
      })
      .addCase(acceptRideThunk.fulfilled, (state, action) => {
        const ride = action.payload;
        state.activeRide = ride;
        rideSlice.caseReducers.upsertRide(state, { payload: ride });
        const id = ride?._id;
        const st = ride?.status;
        if (id && st === "accepted") {
          state.availableRides = (state.availableRides || []).filter((r) => r._id !== id);
        }
      })
      .addCase(respondDriverProposalThunk.fulfilled, (state, action) => {
        const ride = action.payload;
        state.activeRide = ride;
        rideSlice.caseReducers.upsertRide(state, { payload: ride });
        state.error = null;
      })
      .addCase(updatePassengerMinFareThunk.fulfilled, (state, action) => {
        const ride = action.payload;
        state.activeRide = ride;
        rideSlice.caseReducers.upsertRide(state, { payload: ride });
        state.error = null;
      })
      .addCase(driverConfirmBookingThunk.fulfilled, (state, action) => {
        const ride = action.payload;
        state.activeRide = ride;
        rideSlice.caseReducers.upsertRide(state, { payload: ride });
        const id = ride?._id;
        const st = ride?.status;
        if (id && st === "accepted") {
          state.availableRides = (state.availableRides || []).filter((r) => r._id !== id);
        }
        state.error = null;
      })
      .addCase(withdrawOfferThunk.fulfilled, (state, action) => {
        const ride = action.payload;
        state.activeRide = ride;
        rideSlice.caseReducers.upsertRide(state, { payload: ride });
        state.error = null;
      })
      .addCase(driverCancelRideThunk.fulfilled, (state, action) => {
        const ride = action.payload;
        state.activeRide = ride;
        rideSlice.caseReducers.upsertRide(state, { payload: ride });
        state.error = null;
      })
      .addCase(startRideThunk.fulfilled, (state, action) => {
        const ride = action.payload;
        state.activeRide = ride;
        rideSlice.caseReducers.upsertRide(state, { payload: ride });
      })
      .addCase(endRideThunk.fulfilled, (state, action) => {
        const ride = action.payload;
        state.activeRide = ride;
        rideSlice.caseReducers.upsertRide(state, { payload: ride });
      })
      .addCase(rateRideThunk.fulfilled, (state) => {
        state.activeRide = null;
        state.error = null;
      })
      .addCase(fetchAdminUsers.fulfilled, (state, action) => {
        state.adminUsers = action.payload || [];
      })
      .addCase(fetchAdminRides.fulfilled, (state, action) => {
        state.adminRides = action.payload || [];
      })
      .addCase(fetchAdminStats.fulfilled, (state, action) => {
        state.adminStats = action.payload;
      })
      .addCase(updateAdminUserThunk.fulfilled, (state, action) => {
        const u = action.payload;
        if (!u?._id) return;
        state.adminUsers = state.adminUsers.map((x) => (x._id === u._id ? { ...x, ...u } : x));
      })
      .addCase(deleteAdminUserThunk.fulfilled, (state, action) => {
        state.adminUsers = state.adminUsers.filter((x) => x._id !== action.payload);
      })
      .addCase(fetchAdminReports.fulfilled, (state, action) => {
        state.adminReports = action.payload || [];
      })
      .addCase(fetchAdminAuditLogs.fulfilled, (state, action) => {
        state.adminAuditLogs = action.payload || [];
      })
      .addCase(updateAdminReportThunk.fulfilled, (state, action) => {
        const r = action.payload;
        if (!r?._id) return;
        state.adminReports = state.adminReports.map((x) => (x._id === r._id ? r : x));
      })
      .addCase(fetchAdminTransactions.fulfilled, (state, action) => {
        state.adminTransactions = action.payload || [];
      })
      .addCase(flagAdminTransactionThunk.fulfilled, (state, action) => {
        const tx = action.payload;
        if (!tx?._id) return;
        state.adminTransactions = state.adminTransactions.map((x) => (x._id === tx._id ? { ...x, ...tx } : x));
      })
      .addMatcher(
        (action) => action.type.endsWith("/rejected") && action.type.startsWith("ride/"),
        (state, action) => {
          state.error = action.payload || "Error";
        }
      );
  },
});

export const { clearRideError, setActiveRide, upsertRide, setActiveRideId, upsertAvailableRides } = rideSlice.actions;
export default rideSlice.reducer;
