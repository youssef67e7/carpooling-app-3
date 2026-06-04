import { View, Text, StyleSheet, I18nManager } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";
import { weretElevation, weretRadius } from "../../../theme/weretDesignSystem";

export default function WeretMenuHero({ name, roleLabel, colors, spacing }) {
  const rtl = I18nManager.isRTL;
  const initial = String(name || "?")
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <Animated.View
      entering={FadeInUp.duration(400).springify().damping(20)}
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
      <View style={[styles.topStripe, { backgroundColor: colors.text }]} />
      <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: spacing.md }}>
        <View style={[styles.avatarOuter, { borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.text }]}>
            <Text style={[styles.initial, { color: colors.primaryText }]}>{initial}</Text>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.hello, { color: colors.textMuted, textAlign: rtl ? "right" : "left" }]}>WERET</Text>
          <Text style={[styles.name, { color: colors.text, textAlign: rtl ? "right" : "left" }]} numberOfLines={1}>
            {name || "—"}
          </Text>
          {roleLabel ? (
            <View
              style={[
                styles.rolePill,
                {
                  alignSelf: rtl ? "flex-end" : "flex-start",
                  backgroundColor: colors.text,
                },
              ]}
            >
              <Ionicons name="shield-checkmark" size={12} color={colors.primaryText} />
              <Text style={[styles.roleText, { color: colors.primaryText }]}>{roleLabel}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: weretRadius.card, borderWidth: 1.5, overflow: "hidden" },
  topStripe: { height: 4, width: "100%", marginBottom: 14, borderRadius: 2 },
  avatarOuter: {
    padding: 3,
    borderRadius: 32,
    borderWidth: 1.5,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: { fontSize: 22, fontWeight: "900" },
  hello: { fontSize: 10, fontWeight: "800", letterSpacing: 1.4, textTransform: "uppercase" },
  name: { fontSize: 22, fontWeight: "900", marginTop: 2, letterSpacing: -0.4 },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 10,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: weretRadius.pill,
  },
  roleText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.3 },
});
