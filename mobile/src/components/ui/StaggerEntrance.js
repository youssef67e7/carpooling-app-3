import { FadeInUp } from "react-native-reanimated";
import Animated from "react-native-reanimated";
import { D } from "../../animation/presets";

const MAX_STAGGER_ITEMS = 14;
const STAGGER_MS = 42;

/**
 * List row wrapper: fade + slight slide up with optional stagger by index.
 */
export default function StaggerEntrance({ index = 0, children, style }) {
  const delay = Math.min(index, MAX_STAGGER_ITEMS) * STAGGER_MS;
  return (
    <Animated.View entering={FadeInUp.duration(D.normal).delay(delay)} style={style}>
      {children}
    </Animated.View>
  );
}
