import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import rideReducer from "./slices/rideSlice";
import uiReducer from "./slices/uiSlice";
import walletReducer from "./slices/walletSlice";
import driverReducer from "./slices/driverSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ride: rideReducer,
    ui: uiReducer,
    wallet: walletReducer,
    driver: driverReducer,
  },
  middleware: (getDefault) =>
    getDefault({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST"],
      },
    }),
});
