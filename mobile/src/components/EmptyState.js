import { View, Text, StyleSheet, I18nManager } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeProvider";
import { weretRadius, weretElevation } from "../theme/weretDesignSystem";
import CarMascot from "./mascot/CarMascot";

export default function EmptyState({ title, subtitle, mascot, mascotMode = "idle", icon = "car-outline" }) {
  const { colors, spacing } = useTheme();
  const rtl = I18nManager.isRTL;

  return (
    <View
      style={[
        styles.box,
        {
          padding: spacing.lg,
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: weretRadius.card,
          ...weretElevation.card,
        },
      ]}
    >
      {mascot ? (
        <View style={{ alignItems: "center", marginBottom: spacing.md }}>
          <CarMascot size={80} mode={mascotMode} />
        </View>
      ) : (
        <View style={[styles.iconRing, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
          <MaterialCommunityIcons name={icon} size={36} color={colors.text} />
        </View>
      )}
      <Text style={{ color: colors.text, fontWeight: "800", fontSize: 17, textAlign: "center", letterSpacing: -0.2 }}>
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={{
            marginTop: spacing.sm,
            color: colors.textMuted,
            textAlign: "center",
            fontSize: 14,
            lineHeight: 21,
            fontWeight: "500",
          }}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: "center",
    borderWidth: 1,
    borderStyle: "dashed",
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
});
