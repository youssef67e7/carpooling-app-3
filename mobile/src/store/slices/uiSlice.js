import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";

const THEME_KEY = "weret_theme_mode";
const THEME_KEY_LEGACY = "ridehail_theme_mode";

export const hydrateUi = createAsyncThunk("ui/hydrate", async () => {
  let raw = await AsyncStorage.getItem(THEME_KEY);
  if (!raw) {
    const legacy = await AsyncStorage.getItem(THEME_KEY_LEGACY);
    if (legacy) {
      await AsyncStorage.setItem(THEME_KEY, legacy);
      await AsyncStorage.removeItem(THEME_KEY_LEGACY);
      raw = legacy;
    }
  }
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  return "system";
});

export const setThemeModeThunk = createAsyncThunk("ui/setTheme", async (mode, { rejectWithValue }) => {
  try {
    if (!["light", "dark", "system"].includes(mode)) throw new Error("Invalid theme");
    await AsyncStorage.setItem(THEME_KEY, mode);
    return mode;
  } catch (e) {
    return rejectWithValue(String(e));
  }
});

const uiSlice = createSlice({
  name: "ui",
  initialState: {
    themeMode: "system",
    hydrated: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(hydrateUi.fulfilled, (state, action) => {
        state.themeMode = action.payload;
        state.hydrated = true;
      })
      .addCase(hydrateUi.rejected, (state) => {
        state.hydrated = true;
      })
      .addCase(setThemeModeThunk.fulfilled, (state, action) => {
        state.themeMode = action.payload;
      });
  },
});

export default uiSlice.reducer;
