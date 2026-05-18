import { Platform } from "react-native";

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = { sm: 10, md: 14, lg: 18, xl: 22, full: 999 };

/** Soft elevation — prefer on light surfaces */
export function cardShadow(isDark) {
  if (isDark) {
    return {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.28,
      shadowRadius: 10,
      elevation: 6,
    };
  }
  return {
    shadowColor: "#1e3a5f",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 14,
    elevation: Platform.OS === "android" ? 4 : 8,
  };
}

export function getPalette(isDark) {
  if (isDark) {
    return {
      bg: "#121212",
      surface: "#1c1c1c",
      surfaceMuted: "#2a2a2a",
      border: "#333333",
      text: "#f5f5f5",
      textMuted: "#a3a3a3",
      primary: "#3b82f6",
      primaryText: "#ffffff",
      success: "#22c55e",
      danger: "#ef4444",
      overlay: "rgba(18,18,18,0.94)",
      primarySoft: "#1e3a5f",
      successSoft: "#14532d",
      accentLime: "#d4fc5c",
      accentLimeText: "#0f0f0f",
      infoBarBg: "#1d4ed8",
      infoBarText: "#ffffff",
    };
  }
  return {
    bg: "#eef6ff",
    surface: "#ffffff",
    surfaceMuted: "#f4f8fc",
    border: "#dbeafe",
    text: "#0f172a",
    textMuted: "#64748b",
    primary: "#3b82f6",
    primarySoft: "#dbeafe",
    primaryText: "#ffffff",
    success: "#22c55e",
    successSoft: "#dcfce7",
    danger: "#dc2626",
    overlay: "rgba(255,255,255,0.96)",
    accentLime: "#bef264",
    accentLimeText: "#0f172a",
    infoBarBg: "#3b82f6",
    infoBarText: "#ffffff",
  };
}
