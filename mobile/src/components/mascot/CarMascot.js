import { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { D } from "../../animation/presets";

/**
 * Friendly car character (Views + Reanimated). Eyes blink & glance; body bounces.
 *
 * Optional Lottie upgrade: add `assets/lottie/car.json` from LottieFiles (search "car cute"),
 * then: import LottieView from 'lottie-react-native';
 * <LottieView source={require('../../../assets/lottie/car.json')} autoPlay loop style={{width,height}} />
 */
export default function CarMascot({
  size = 112,
  /** idle | searching | happy — searching = faster bounce, happy = gentle bounce + smile */
  mode = "idle",
}) {
  const bounce = useSharedValue(0);
  const blink = useSharedValue(1);
  const look = useSharedValue(0);

  const period = mode === "searching" ? 520 : mode === "happy" ? 1400 : 1100;
  const isHappy = mode === "happy";

  useEffect(() => {
    bounce.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: period / 2, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: period / 2, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
    return () => cancelAnimation(bounce);
  }, [bounce, period]);

  useEffect(() => {
    const tick = () => {
      blink.value = withSequence(
        withTiming(0.12, { duration: 70 }),
        withTiming(1, { duration: 140 })
      );
    };
    const id = setInterval(tick, 2600 + Math.random() * 900);
    return () => clearInterval(id);
  }, [blink]);

  useEffect(() => {
    if (isHappy) {
      look.value = 0;
      return undefined;
    }
    const id = setInterval(() => {
      const dir = Math.random() > 0.5 ? 3 : -3;
      look.value = withTiming(dir, { duration: 280, easing: Easing.out(Easing.quad) });
      setTimeout(() => {
        look.value = withTiming(0, { duration: 380, easing: Easing.inOut(Easing.quad) });
      }, 450);
    }, 3800);
    return () => clearInterval(id);
  }, [look, isHappy]);

  const bodyAnim = useAnimatedStyle(() => ({
    transform: [{ translateY: bounce.value }],
  }));

  const eyeAnim = useAnimatedStyle(
    () => ({
      transform: [
        { translateX: look.value },
        { scaleY: blink.value * (isHappy ? 0.88 : 1) },
        { scaleX: isHappy ? 1.08 : 1 },
      ],
    }),
    [isHappy]
  );

  const w = size;
  const h = size * 0.55;
  const wheel = Math.max(6, size * 0.11);

  return (
    <Animated.View style={[styles.wrap, { width: w, height: h + wheel + 4 }, bodyAnim]}>
      <View style={[styles.body, { width: w, height: h, borderRadius: h * 0.28 }]}>
        <View style={[styles.roof, { borderTopLeftRadius: h * 0.35, borderTopRightRadius: h * 0.35 }]} />
        <View style={[styles.windshield, { borderTopLeftRadius: h * 0.22, borderTopRightRadius: h * 0.22 }]}>
          <Animated.View style={[styles.eyesRow, eyeAnim]}>
            <View style={[styles.eye, { width: size * 0.09, height: size * 0.09 }]} />
            <View style={[styles.eye, { width: size * 0.09, height: size * 0.09 }]} />
          </Animated.View>
          {isHappy ? (
            <View
              style={{
                width: size * 0.26,
                height: size * 0.06,
                marginTop: size * 0.02,
                borderBottomLeftRadius: 999,
                borderBottomRightRadius: 999,
                alignSelf: "center",
                borderBottomColor: "#0f172a",
                borderBottomWidth: Math.max(2, size * 0.02),
              }}
            />
          ) : null}
        </View>
      </View>
      <View style={[styles.wheels, { paddingHorizontal: w * 0.12 }]}>
        <View style={[styles.wheel, { width: wheel, height: wheel }]} />
        <View style={[styles.wheel, { width: wheel, height: wheel }]} />
      </View>
    </Animated.View>
  );
}

const BLUE = "#3b82f6";
const GLASS = "rgba(224,242,254,0.95)";

const styles = StyleSheet.create({
  wrap: { justifyContent: "flex-end", alignItems: "center" },
  body: {
    backgroundColor: BLUE,
    justifyContent: "flex-start",
    overflow: "hidden",
    shadowColor: "#1e3a8a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  roof: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#2563eb",
    opacity: 0.85,
    height: "42%",
    bottom: undefined,
  },
  windshield: {
    marginTop: "18%",
    marginHorizontal: "10%",
    height: "52%",
    backgroundColor: GLASS,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
  },
  eyesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  eye: {
    borderRadius: 999,
    backgroundColor: "#0f172a",
    marginHorizontal: 5,
  },
  wheels: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  wheel: {
    borderRadius: 999,
    backgroundColor: "#1e293b",
    borderWidth: 2,
    borderColor: "#334155",
  },
});
