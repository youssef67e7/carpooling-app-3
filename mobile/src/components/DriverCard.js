import { View, Text, StyleSheet, I18nManager, Pressable } from "react-native";
import { useTheme } from "../context/ThemeProvider";

export default function DriverCard({ driver, selected, caption, onPress }) {
  const { colors, spacing, radius } = useTheme();
  const rtl = I18nManager.isRTL;
  if (!driver) return null;

  const inner = (
    <View
      style={[
        styles.wrap,
        {
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          padding: spacing.md,
        },
      ]}
    >
      <View style={{ flexDirection: rtl ? "row-reverse" : "row", justifyContent: "space-between" }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: "700", textAlign: rtl ? "right" : "left" }}>{driver.name}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 4, textAlign: rtl ? "right" : "left" }}>
            {driver.email}
          </Text>
          {caption ? (
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2, textAlign: rtl ? "right" : "left" }}>
              {caption}
            </Text>
          ) : null}
        </View>
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: driver.isOnline ? colors.success : colors.textMuted,
            alignSelf: "center",
            marginStart: spacing.sm,
          }}
        />
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button">
        {inner}
      </Pressable>
    );
  }
  return inner;
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 1, marginBottom: 8 },
});
