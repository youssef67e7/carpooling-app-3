import { Modal, View, Text, StyleSheet, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeProvider";
import { D } from "../../animation/presets";
import CarMascot from "../mascot/CarMascot";

/** Brief success pulse — parent controls visibility & hides after timeout */
export default function SuccessFlash({ visible, title, showHappyMascot }) {
  const { colors, radius } = useTheme();
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      scale.value = 0;
      opacity.value = 0;
      return;
    }
    opacity.value = withTiming(1, { duration: D.fast });
    scale.value = withSequence(
      withSpring(1.1, { damping: 11, stiffness: 260 }),
      withSpring(1, D.spring)
    );
  }, [visible, opacity, scale]);

  const anim = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <Pressable style={styles.backdrop}>
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderRadius: radius.xl ?? 22,
              borderWidth: 1,
              borderColor: colors.border,
            },
            anim,
          ]}
        >
          {showHappyMascot ? (
            <View style={{ marginBottom: 6 }}>
              <CarMascot mode="happy" size={76} />
            </View>
          ) : null}
          <MaterialCommunityIcons name="check-circle" size={56} color={colors.success} />
          {title ? <Text style={[styles.title, { color: colors.text }]}>{title}</Text> : null}
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.42)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  sheet: {
    paddingVertical: 28,
    paddingHorizontal: 32,
    alignItems: "center",
    minWidth: 220,
    elevation: 12,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  title: {
    marginTop: 12,
    fontWeight: "800",
    fontSize: 16,
    textAlign: "center",
  },
});
