import { Platform } from "react-native";
import { D } from "../animation/presets";

/**
 * Single palette for every WERET surface (auth, onboarding, passenger chrome, sheets).
 * Keep hex values here only — screens use `weretAuth` / `weretPassenger` or this file for shadows/motion.
 */
export const weretPalette = {
  surface: "#ffffff",
  surfaceMuted: "#f5f5f5",
  field: "#f2f2f2",
  border: "#e5e5e5",
  ink: "#111111",
  text: "#0a0a0a",
  muted: "#737373",
  mutedLight: "#a3a3a3",
  onPrimary: "#ffffff",
  accent: "#0095ff",
  gold: "#c9a227",
  pillOverlay: "rgba(0,0,0,0.88)",
  splash: "#000000",
  /** Hydrate / splash secondary on black */
  onSplashMuted: "rgba(255,255,255,0.55)",
  danger: "#dc2626",
  scrim: "rgba(0,0,0,0.35)",
  /** Stacked logo 3D offset on light */
  logoShadow: "#c4c4c4",
  subtitleOnDark: "rgba(255,255,255,0.72)",
  overlayLight: "rgba(255,255,255,0.95)",
};

export const weretRadius = {
  field: 16,
  card: 18,
  chip: 14,
  pill: 999,
  dot: 4,
};

export const weretPress = {
  opacity: 0.88,
  opacityStrong: 0.92,
  disabledOpacity: 0.45,
};

export const weretMotion = {
  enterScreen: D.normal,
  enterFast: D.fast,
  staggerItem: 52,
  staggerBrand: 70,
};

export const weretElevation = {
  card: Platform.select({
    ios: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
    },
    android: { elevation: 3 },
    default: {},
  }),
  brand: Platform.select({
    ios: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 0,
    },
    android: { elevation: 0 },
    default: {},
  }),
  heroFloat: Platform.select({
    ios: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.14,
      shadowRadius: 22,
    },
    android: { elevation: 10 },
    default: {},
  }),
  fab: Platform.select({
    ios: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.18,
      shadowRadius: 10,
    },
    android: { elevation: 8 },
    default: {},
  }),
  /** Passenger bottom tab bar */
  tabBar: Platform.select({
    ios: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
    },
    android: { elevation: 16 },
    default: {},
  }),
};

export const weretType = {
  overline: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
};
