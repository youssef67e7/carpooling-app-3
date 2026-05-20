import { Platform } from "react-native";
import { weretPalette } from "./weretDesignSystem";
import { weretElevation } from "./weretDesignSystem";

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = { sm: 10, md: 14, lg: 18, xl: 22, full: 999 };

/** Soft elevation — WERET monochrome cards on light surfaces */
export function cardShadow(_isDark) {
  return weretElevation.card;
}

/** App-wide palette aligned with WERET Figma (light + dark). */
export function getPalette(isDark) {
  if (isDark) {
    return {
      bg: "#121212",
      surface: "#1c1c1c",
      surfaceMuted: "#2a2a2a",
      border: "#404040",
      text: "#f5f5f5",
      textMuted: "#a3a3a3",
      primary: weretPalette.onPrimary,
      primarySoft: "#2a2a2a",
      primaryText: weretPalette.ink,
      success: "#22c55e",
      successSoft: "#14532d",
      danger: weretPalette.danger,
      overlay: "rgba(18,18,18,0.94)",
      accentLime: weretPalette.onPrimary,
      accentLimeText: weretPalette.ink,
      infoBarBg: "#1c1c1c",
      infoBarText: "#ffffff",
    };
  }
  return {
    bg: weretPalette.surfaceMuted,
    surface: weretPalette.surface,
    surfaceMuted: weretPalette.field,
    border: weretPalette.border,
    text: weretPalette.text,
    textMuted: weretPalette.muted,
    primary: weretPalette.ink,
    primarySoft: weretPalette.field,
    primaryText: weretPalette.onPrimary,
    success: "#16a34a",
    successSoft: "#dcfce7",
    danger: weretPalette.danger,
    overlay: weretPalette.overlayLight,
    accentLime: weretPalette.ink,
    accentLimeText: weretPalette.onPrimary,
    infoBarBg: weretPalette.ink,
    infoBarText: weretPalette.onPrimary,
  };
}
