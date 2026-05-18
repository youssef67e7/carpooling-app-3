import { View, StyleSheet } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useTheme } from "../../context/ThemeProvider";
import { cardShadow } from "../../theme/tokens";
import { weretListChromeColors } from "../../theme/weretPassenger";
import { weretRadius } from "../../theme/weretDesignSystem";
import { D } from "../../animation/presets";

/**
 * Rounded card with soft shadow for settings / grouped content.
 * @param {boolean} [weret] — use WERET list chrome (driver onboarding, etc.)
 */
export default function SectionSurface({ children, style, noEntering, weret }) {
  const { colors: themeColors, radius: themeRadius, isDark } = useTheme();
  const colors = weret ? weretListChromeColors : themeColors;
  const radius = weret ? { ...themeRadius, lg: weretRadius.card } : themeRadius;
  const shadow = cardShadow(isDark);

  const inner = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          ...shadow,
        },
        style,
      ]}
    >
      {children}
    </View>
  );

  if (noEntering) return inner;

  return (
    <Animated.View entering={FadeIn.duration(D.normal)} style={{ overflow: "visible" }}>
      {inner}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 12,
    overflow: "visible",
  },
});
