import { Pressable, View, Text, I18nManager, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";
import { weretElevation, weretRadius, weretPress } from "../../theme/weretDesignSystem";

export default function MoreMenuRow({ icon, title, subtitle, onPress, colors, spacing, radius, index = 0 }) {
  const rtl = I18nManager.isRTL;
  return (
    <Animated.View entering={FadeInUp.delay(index * 40).duration(320).springify().damping(18)}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.row,
          {
            borderColor: colors.border,
            backgroundColor: colors.surface,
            borderRadius: radius?.lg ?? weretRadius.card,
            padding: spacing.md,
            marginBottom: spacing.sm,
            flexDirection: rtl ? "row-reverse" : "row",
            alignItems: "center",
            opacity: pressed ? weretPress.opacityStrong : 1,
            transform: [{ scale: pressed ? 0.985 : 1 }],
            ...weretElevation.card,
          },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.text }]}>
          <Ionicons name={icon} size={22} color={colors.primaryText} />
        </View>
        <View style={{ flex: 1, marginStart: spacing.md }}>
          <Text style={[styles.title, { color: colors.text, textAlign: rtl ? "right" : "left" }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.sub, { color: colors.textMuted, textAlign: rtl ? "right" : "left" }]}>{subtitle}</Text>
          ) : null}
        </View>
        <View style={[styles.chevron, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
          <Ionicons name={rtl ? "chevron-back" : "chevron-forward"} size={18} color={colors.text} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { borderWidth: 1.5 },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontWeight: "800", fontSize: 16, letterSpacing: -0.25 },
  sub: { fontSize: 13, marginTop: 4, fontWeight: "500", lineHeight: 18 },
  chevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
