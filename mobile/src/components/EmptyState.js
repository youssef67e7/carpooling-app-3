import { View, Text, StyleSheet, I18nManager } from "react-native";
import { useTheme } from "../context/ThemeProvider";
import CarMascot from "./mascot/CarMascot";

export default function EmptyState({ title, subtitle, mascot, mascotMode = "idle" }) {
  const { colors, spacing } = useTheme();
  const rtl = I18nManager.isRTL;

  return (
    <View style={[styles.box, { padding: spacing.lg }]}>
      {mascot ? (
        <View style={{ alignItems: "center", marginBottom: spacing.md }}>
          <CarMascot size={80} mode={mascotMode} />
        </View>
      ) : null}
      <Text style={{ color: colors.text, fontWeight: "700", fontSize: 16, textAlign: rtl ? "right" : "center" }}>
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={{
            marginTop: spacing.sm,
            color: colors.textMuted,
            textAlign: rtl ? "right" : "center",
            fontSize: 14,
          }}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: "stretch" },
});
