import { useMemo } from "react";
import { useTheme } from "../context/ThemeProvider";
import { weretListChromeColors, weretListChromeColorsDark } from "../theme/weretPassenger";
import { weretRadius } from "../theme/weretDesignSystem";

/** Theme spacing + radius merged with WERET list colors (driver stack). */
export function useWeretScreenChrome() {
  const { spacing, radius: r0, isDark } = useTheme();
  return useMemo(
    () => ({
      colors: isDark ? weretListChromeColorsDark : weretListChromeColors,
      spacing,
      radius: { ...r0, md: weretRadius.card, lg: weretRadius.card },
      isDark: Boolean(isDark),
    }),
    [spacing, r0, isDark]
  );
}
