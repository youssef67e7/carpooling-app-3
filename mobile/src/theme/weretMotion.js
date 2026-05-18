import { FadeIn, FadeInDown } from "react-native-reanimated";
import { weretMotion } from "./weretDesignSystem";

const d = weretMotion.enterScreen;
const f = weretMotion.enterFast;

/** Shared WERET entrances — `entering={weretEnter.brand}` on `Animated.View` from reanimated */
export const weretEnter = {
  screen: FadeInDown.duration(d),
  block: FadeInDown.duration(d).delay(40),
  row: FadeInDown.duration(d).delay(80),
  fade: FadeIn.duration(f),
  galleryCard: (index = 0) => FadeIn.duration(f + 40).delay(90 + index * weretMotion.staggerItem),
  brand: FadeInDown.duration(d),
};
