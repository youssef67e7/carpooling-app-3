import { Text, ActivityIndicator, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Pressable } from "react-native";
import { useTheme } from "../context/ThemeProvider";
import { D } from "../animation/presets";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function CustomButton({
  title,
  onPress,
  variant = "primary",
  disabled,
  loading,
  style,
  textStyle,
}) {
  const { colors, spacing, radius } = useTheme();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const v =
    variant === "outline"
      ? "outline"
      : variant === "danger"
        ? "danger"
        : variant === "ink"
          ? "ink"
          : variant === "lime"
            ? "lime"
            : "primary";
  const bg =
    v === "outline"
      ? "transparent"
      : v === "danger"
        ? colors.danger
        : v === "ink"
          ? "#111111"
          : v === "lime"
            ? colors.accentLime || "#d4fc5c"
            : colors.primary;
  const borderColor = v === "outline" ? colors.border : "transparent";
  const color =
    v === "outline"
      ? colors.text
      : v === "ink"
        ? "#ffffff"
        : v === "lime"
          ? colors.accentLimeText || "#0f0f0f"
          : colors.primaryText;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      onPressIn={() => {
        scale.value = withSpring(0.96, D.press);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, D.spring);
      }}
      style={[
        styles.base,
        animStyle,
        {
          paddingVertical: spacing.sm + 4,
          paddingHorizontal: spacing.md,
          borderRadius: v === "ink" ? 999 : radius.md,
          backgroundColor: bg,
          borderWidth: v === "outline" ? 1 : 0,
          borderColor,
          opacity: disabled ? 0.55 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={
            v === "outline"
              ? colors.primary
              : v === "lime"
                ? colors.accentLimeText || "#0f0f0f"
                : v === "ink"
                  ? "#ffffff"
                  : colors.primaryText
          }
        />
      ) : (
        <Text style={[styles.text, { color }, textStyle]}>{title}</Text>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center" },
  text: { fontWeight: "700", fontSize: 16 },
});
