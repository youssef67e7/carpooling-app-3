import { Pressable, View, Text, I18nManager, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function MoreMenuRow({ icon, title, subtitle, onPress, colors, spacing, radius }) {
  const rtl = I18nManager.isRTL;
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.row,
        {
          borderColor: colors.border,
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          padding: spacing.md,
          marginBottom: spacing.sm,
          flexDirection: rtl ? "row-reverse" : "row",
          alignItems: "center",
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.surfaceMuted }]}>
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <View style={{ flex: 1, marginStart: spacing.md }}>
        <Text style={[styles.title, { color: colors.text, textAlign: rtl ? "right" : "left" }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.sub, { color: colors.textMuted, textAlign: rtl ? "right" : "left" }]}>{subtitle}</Text>
        ) : null}
      </View>
      <Ionicons
        name={rtl ? "chevron-back" : "chevron-forward"}
        size={20}
        color={colors.textMuted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { borderWidth: 1 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  title: { fontWeight: "700", fontSize: 16 },
  sub: { fontSize: 13, marginTop: 2 },
});
