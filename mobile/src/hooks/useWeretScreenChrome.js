import { useMemo } from "react";
import { useTheme } from "../context/ThemeProvider";
import { weretListChromeColors } from "../theme/weretPassenger";
import { weretRadius } from "../theme/weretDesignSystem";

/** Theme spacing + radius merged with WERET list colors (driver stack). */
export function useWeretScreenChrome() {
  const { spacing, radius: r0 } = useTheme();
  return useMemo(
    () => ({
      colors: weretListChromeColors,
      spacing,
      radius: { ...r0, md: weretRadius.card, lg: weretRadius.card },
    }),
    [spacing, r0]
  );
}
