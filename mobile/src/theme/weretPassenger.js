import { weretPalette } from "./weretDesignSystem";

/** Shared WERET chrome (sheets, tabs, headers) — passenger + driver */
export const weretPassenger = {
  sheet: weretPalette.surface,
  field: weretPalette.field,
  border: weretPalette.border,
  ink: weretPalette.ink,
  text: weretPalette.text,
  muted: weretPalette.muted,
  accent: weretPalette.accent,
  gold: weretPalette.gold,
  pillOverlay: weretPalette.pillOverlay,
  surfaceMuted: weretPalette.surfaceMuted,
  onPrimary: weretPalette.onPrimary,
  scrim: weretPalette.scrim,
  /** Map / overlay shadows */
  shadow: "#000000",
};

/**
 * Frozen `colors` shape compatible with ThemeProvider — use on driver WERET screens
 * (lists, forms, onboarding) so UI matches tab/header chrome without rewiring every prop.
 */
export const weretListChromeColors = Object.freeze({
  bg: weretPalette.surfaceMuted,
  surface: weretPalette.surface,
  surfaceMuted: weretPalette.field,
  border: weretPalette.border,
  text: weretPalette.text,
  textMuted: weretPalette.muted,
  primary: weretPalette.ink,
  accent: weretPalette.accent,
  primaryText: weretPalette.onPrimary,
  danger: weretPalette.danger,
  success: "#16a34a",
  /** Legacy lime slots → WERET ink pills */
  accentLime: weretPalette.ink,
  accentLimeText: weretPalette.onPrimary,
});

/** WERET chrome when app theme is dark (readable borders + text). */
export const weretListChromeColorsDark = Object.freeze({
  bg: "#121212",
  surface: "#1c1c1c",
  surfaceMuted: "#2a2a2a",
  border: "#404040",
  text: "#f5f5f5",
  textMuted: "#a3a3a3",
  primary: "#f5f5f5",
  accent: weretPalette.accent,
  primaryText: "#111111",
  danger: weretPalette.danger,
  success: "#22c55e",
  accentLime: "#f5f5f5",
  accentLimeText: "#111111",
});
