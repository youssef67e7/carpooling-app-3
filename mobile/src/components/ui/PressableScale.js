import { Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { D } from "../../animation/presets";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Micro-interaction: scale to ~0.96 on press. Uses native driver.
 */
export default function PressableScale({
  children,
  onPress,
  disabled,
  style,
  accessibilityRole,
  accessibilityLabel,
  hitSlop,
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      hitSlop={hitSlop}
      disabled={disabled}
      onPressIn={() => {
        scale.value = withSpring(0.96, D.press);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, D.spring);
      }}
      onPress={onPress}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
