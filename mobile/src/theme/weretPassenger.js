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
  primary: weretPalette.accent,
  accent: weretPalette.accent,
  primaryText: weretPalette.onPrimary,
  danger: weretPalette.danger,
  success: "#16a34a",
  /** Legacy lime slots → WERET ink pills */
  accentLime: weretPalette.ink,
  accentLimeText: weretPalette.onPrimary,
});
