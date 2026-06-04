import { View, StyleSheet } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { weretElevation, weretRadius } from "../../../theme/weretDesignSystem";

const VARIANTS = {
  default: (c) => ({ bg: c.surface, border: c.border }),
  muted: (c) => ({ bg: c.surfaceMuted, border: c.border }),
  accent: () => ({ bg: "#f5f5f5", border: "#111111" }),
  success: () => ({ bg: "#f0fdf4", border: "#22c55e" }),
  warning: () => ({ bg: "#fffbeb", border: "#f59e0b" }),
};

/** Elevated content block for home sheets & alerts */
export default function WeretSurfaceCard({ children, colors, spacing, variant = "default", style, animate = true }) {
  const tone = VARIANTS[variant]?.(colors) ?? VARIANTS.default(colors);
  const inner = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: tone.bg,
          borderColor: tone.border,
          padding: spacing?.md ?? 16,
          ...weretElevation.card,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
  if (!animate) return inner;
  return (
    <Animated.View entering={FadeInUp.duration(280).springify().damping(20)}>
      {inner}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: weretRadius.card,
    borderWidth: 1.5,
    overflow: "hidden",
  },
});
