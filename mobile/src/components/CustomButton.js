import { Text, ActivityIndicator, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Pressable } from "react-native";
import { weretAuth as A } from "../theme/weretAuth";
import { weretPalette, weretPress, weretRadius, weretElevation } from "../theme/weretDesignSystem";
import { D } from "../animation/presets";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** WERET pill CTA — same tokens as WeretPillButton (ink / outline / danger). */
export default function CustomButton({
  title,
  onPress,
  variant = "primary",
  disabled,
  loading,
  style,
  textStyle,
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const v =
    variant === "outline"
      ? "outline"
      : variant === "danger"
        ? "danger"
        : "fill";

  const bg = v === "outline" ? A.bg : v === "danger" ? weretPalette.danger : A.ink;
  const borderColor = v === "outline" ? A.ink : "transparent";
  const color = v === "outline" ? A.ink : v === "danger" ? "#fff" : A.onPrimary;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      onPressIn={() => {
        scale.value = withSpring(0.98, D.press);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, D.spring);
      }}
      style={[
        styles.base,
        animStyle,
        {
          paddingVertical: 16,
          paddingHorizontal: 22,
          borderRadius: weretRadius.pill,
          backgroundColor: bg,
          borderWidth: v === "outline" ? 2 : 0,
          borderColor,
          opacity: disabled ? weretPress.disabledOpacity : 1,
          ...(v === "fill" || v === "danger" ? weretElevation.fab : null),
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <Text style={[styles.text, { color }, textStyle]}>{title}</Text>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center", minHeight: 54 },
  text: { fontWeight: "800", fontSize: 16, letterSpacing: 0.2 },
});
