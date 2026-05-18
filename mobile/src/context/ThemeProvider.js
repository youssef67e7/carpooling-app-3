import { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";
import { useSelector } from "react-redux";
import { getPalette, spacing, radius } from "../theme/tokens";

export const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const themeMode = useSelector((s) => s.ui.themeMode);
  const system = useColorScheme();
  const resolvedDark =
    themeMode === "dark" || (themeMode === "system" && system === "dark");

  const value = useMemo(
    () => ({
      colors: getPalette(resolvedDark),
      spacing,
      radius,
      isDark: resolvedDark,
    }),
    [resolvedDark]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      colors: getPalette(false),
      spacing,
      radius,
      isDark: false,
    };
  }
  return ctx;
}
