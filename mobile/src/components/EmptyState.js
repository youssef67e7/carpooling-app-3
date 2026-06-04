import { View, Text, StyleSheet, I18nManager } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { useWeretScreenChrome } from "../hooks/useWeretScreenChrome";
import { weretRadius, weretElevation } from "../theme/weretDesignSystem";
import CarMascot from "./mascot/CarMascot";

export default function EmptyState({ title, subtitle, mascot, mascotMode = "idle", icon = "car-outline" }) {
  const { colors, spacing } = useWeretScreenChrome();
  const rtl = I18nManager.isRTL;

  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      style={[
        styles.box,
        {
          padding: spacing.lg,
          backgroundColor: colors.surface,
          borderColor: colors.borderSubtle || colors.border,
          borderRadius: weretRadius.card,
          ...weretElevation.card,
        },
      ]}
    >
      {mascot ? (
        <View style={[styles.mascotWrap, { marginBottom: spacing.md }]}>
          <View style={[styles.mascotRing, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}>
            <CarMascot size={72} mode={mascotMode} />
          </View>
        </View>
      ) : (
        <View style={[styles.iconRing, { backgroundColor: colors.text, borderColor: colors.border }]}>
          <MaterialCommunityIcons name={icon} size={32} color={colors.primaryText} />
        </View>
      )}
      <Text
        style={{
          color: colors.text,
          fontWeight: "900",
          fontSize: 18,
          textAlign: "center",
          letterSpacing: -0.4,
          marginTop: mascot ? 0 : spacing.sm,
        }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={{
            marginTop: spacing.sm,
            color: colors.textMuted,
            textAlign: "center",
            fontSize: 14,
            lineHeight: 22,
            fontWeight: "500",
            paddingHorizontal: spacing.sm,
          }}
        >
          {subtitle}
        </Text>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: "center",
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
  mascotWrap: { alignItems: "center" },
  mascotRing: {
    padding: 12,
    borderRadius: weretRadius.card,
    borderWidth: 1,
  },
  iconRing: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
});
