import { useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, I18nManager } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeProvider";
import { D } from "../../animation/presets";

/** Compact auth/API error with subtle shake when `message` appears or changes. */
export default function FormErrorCallout({ message }) {
  const { colors, radius, spacing, isDark } = useTheme();
  const rtl = I18nManager.isRTL;
  const shake = useSharedValue(0);

  useEffect(() => {
    if (!message) return;
    shake.value = withSequence(
      withTiming(-10, { duration: Math.round(D.fast / 3) }),
      withTiming(10, { duration: Math.round(D.fast / 3) }),
      withTiming(-6, { duration: Math.round(D.fast / 4) }),
      withTiming(6, { duration: Math.round(D.fast / 4) }),
      withTiming(0, { duration: Math.round(D.fast / 3) })
    );
  }, [message, shake]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));

  if (!message) return null;

  const bg = isDark ? "rgba(239,68,68,0.14)" : "#fef2f2";
  const border = isDark ? "rgba(239,68,68,0.42)" : "#fecaca";

  return (
    <Animated.View style={[animStyle, { marginBottom: spacing.md }]}>
      <View
        style={[
          styles.row,
          { flexDirection: rtl ? "row-reverse" : "row", borderRadius: radius.md, borderWidth: 1, borderColor: border, backgroundColor: bg, padding: spacing.sm },
        ]}
      >
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={22}
          color={colors.danger}
          style={rtl ? { marginLeft: spacing.sm } : { marginRight: spacing.sm }}
        />
        <ScrollView
          style={styles.scroll}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={message.length > 400}
        >
          <Text style={[styles.text, { color: colors.danger, textAlign: rtl ? "right" : "left" }]}>{message}</Text>
        </ScrollView>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "flex-start" },
  scroll: { flex: 1, maxHeight: 140 },
  text: { fontSize: 13, lineHeight: 19 },
});
