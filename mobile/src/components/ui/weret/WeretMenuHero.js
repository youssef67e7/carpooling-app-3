import { View, Text, StyleSheet, I18nManager } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { weretElevation, weretRadius } from "../../../theme/weretDesignSystem";

export default function WeretMenuHero({ name, roleLabel, colors, spacing }) {
  const rtl = I18nManager.isRTL;
  const initial = String(name || "?")
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          padding: spacing.lg,
          marginBottom: spacing.md,
          ...weretElevation.heroFloat,
        },
      ]}
    >
      <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: spacing.md }}>
        <View style={[styles.avatar, { backgroundColor: colors.text }]}>
          <Text style={[styles.initial, { color: colors.primaryText }]}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.hello, { color: colors.textMuted, textAlign: rtl ? "right" : "left" }]}>WERET</Text>
          <Text style={[styles.name, { color: colors.text, textAlign: rtl ? "right" : "left" }]} numberOfLines={1}>
            {name || "—"}
          </Text>
          {roleLabel ? (
            <View style={[styles.rolePill, { alignSelf: rtl ? "flex-end" : "flex-start", backgroundColor: colors.surfaceMuted }]}>
              <Ionicons name="shield-checkmark-outline" size={12} color={colors.text} />
              <Text style={[styles.roleText, { color: colors.text }]}>{roleLabel}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: weretRadius.card, borderWidth: 1 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: { fontSize: 22, fontWeight: "900" },
  hello: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase" },
  name: { fontSize: 20, fontWeight: "900", marginTop: 2, letterSpacing: -0.3 },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: weretRadius.pill,
  },
  roleText: { fontSize: 11, fontWeight: "800" },
});
