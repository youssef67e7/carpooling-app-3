import { useMemo, useRef } from "react";
import { View, Text, Pressable, I18nManager, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function ModeSwitchRow({ value, onChange, colors, spacing, radius, disabled, loading, t }) {
  const rtl = I18nManager.isRTL;
  const anim = useRef(new Animated.Value(value === "driver" ? 1 : 0)).current;

  // keep animation in sync (simple derived update)
  useMemo(() => {
    Animated.timing(anim, { toValue: value === "driver" ? 1 : 0, duration: 220, useNativeDriver: true }).start();
  }, [anim, value]);

  const leftOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] });
  const rightOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });

  const isPassenger = value !== "driver";
  const icon = isPassenger ? "person-outline" : "car-outline";

  return (
    <View
      style={[
        styles.wrap,
        {
          borderColor: colors.border,
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          padding: spacing.md,
          marginBottom: spacing.sm,
        },
      ]}
    >
      <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center" }}>
        <View style={[styles.iconWrap, { backgroundColor: colors.surfaceMuted }]}>
          <Ionicons name={icon} size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1, marginStart: spacing.md }}>
          <Text style={[styles.title, { color: colors.text, textAlign: rtl ? "right" : "left" }]}>{t("currentMode")}</Text>
          <Text style={[styles.sub, { color: colors.textMuted, textAlign: rtl ? "right" : "left" }]}>
            {isPassenger ? t("modePassenger") : t("modeDriver")}
            {loading ? ` · ${t("loading")}` : ""}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: rtl ? "row-reverse" : "row", marginTop: spacing.sm, gap: spacing.sm }}>
        <Animated.View style={{ flex: 1, opacity: leftOpacity }}>
          <Pressable
            onPress={() => onChange("passenger")}
            disabled={disabled || loading}
            accessibilityRole="button"
            style={[
              styles.pill,
              {
                borderColor: colors.border,
                backgroundColor: isPassenger ? colors.primary : colors.surface,
              },
            ]}
          >
            <Ionicons name="person-outline" size={18} color={isPassenger ? colors.primaryText : colors.textMuted} />
            <Text style={{ color: isPassenger ? colors.primaryText : colors.text, fontWeight: "800", marginStart: 8 }}>
              {t("modePassenger")}
            </Text>
          </Pressable>
        </Animated.View>

        <Animated.View style={{ flex: 1, opacity: rightOpacity }}>
          <Pressable
            onPress={() => onChange("driver")}
            disabled={disabled || loading}
            accessibilityRole="button"
            style={[
              styles.pill,
              {
                borderColor: colors.border,
                backgroundColor: !isPassenger ? colors.primary : colors.surface,
              },
            ]}
          >
            <Ionicons name="car-outline" size={18} color={!isPassenger ? colors.primaryText : colors.textMuted} />
            <Text style={{ color: !isPassenger ? colors.primaryText : colors.text, fontWeight: "800", marginStart: 8 }}>
              {t("modeDriver")}
            </Text>
          </Pressable>
        </Animated.View>
      </View>

      <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: spacing.sm, textAlign: rtl ? "right" : "left" }}>
        {t("roleSwitchHint")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 1 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  title: { fontWeight: "800", fontSize: 16 },
  sub: { fontSize: 13, marginTop: 2, fontWeight: "700" },
  pill: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});

