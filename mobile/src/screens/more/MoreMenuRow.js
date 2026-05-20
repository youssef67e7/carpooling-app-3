import { Pressable, View, Text, I18nManager, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { weretElevation, weretRadius } from "../../theme/weretDesignSystem";

export default function MoreMenuRow({ icon, title, subtitle, onPress, colors, spacing, radius }) {
  const rtl = I18nManager.isRTL;
  return (
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
          opacity: pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.99 : 1 }],
          ...weretElevation.card,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.text }]}>
        <Ionicons name={icon} size={20} color={colors.primaryText} />
      </View>
      <View style={{ flex: 1, marginStart: spacing.md }}>
        <Text style={[styles.title, { color: colors.text, textAlign: rtl ? "right" : "left" }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.sub, { color: colors.textMuted, textAlign: rtl ? "right" : "left" }]}>{subtitle}</Text>
        ) : null}
      </View>
      <Ionicons name={rtl ? "chevron-back" : "chevron-forward"} size={20} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { borderWidth: 1 },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontWeight: "800", fontSize: 16, letterSpacing: -0.2 },
  sub: { fontSize: 13, marginTop: 3, fontWeight: "500", lineHeight: 18 },
});
