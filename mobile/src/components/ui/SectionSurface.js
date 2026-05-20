import { View, StyleSheet } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useTheme } from "../../context/ThemeProvider";
import { weretListChromeColors } from "../../theme/weretPassenger";
import { weretRadius, weretElevation } from "../../theme/weretDesignSystem";
import { D } from "../../animation/presets";

/**
 * Rounded card with soft shadow for settings / grouped content (WERET style).
 */
export default function SectionSurface({ children, style, noEntering, elevated }) {
  const { radius: themeRadius } = useTheme();
  const colors = weretListChromeColors;
  const radius = { ...themeRadius, lg: weretRadius.card };
  const shadow = elevated ? weretElevation.heroFloat : weretElevation.card;

  const inner = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
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
    padding: 18,
    marginBottom: 12,
    overflow: "visible",
  },
});
