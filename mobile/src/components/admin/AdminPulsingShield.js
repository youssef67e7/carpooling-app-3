import { useEffect } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

/** Soft pulse on shield — symbolic “secured admin” affordance. */
export default function AdminPulsingShield({ color, size = 28 }) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
    return () => cancelAnimation(pulse);
  }, [pulse]);

  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <Animated.View style={anim}>
      <Ionicons name="shield-checkmark" size={size} color={color} />
    </Animated.View>
  );
}
