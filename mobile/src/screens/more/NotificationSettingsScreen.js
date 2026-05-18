import { useState } from "react";
import { View, Text, Switch, I18nManager, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../context/ThemeProvider";

function Row({ label, value, onValueChange, colors, spacing, radius, rtl }) {
  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.md,
          padding: spacing.md,
          marginBottom: spacing.sm,
          flexDirection: rtl ? "row-reverse" : "row",
          alignItems: "center",
        },
      ]}
    >
      <Text style={{ flex: 1, color: colors.text, fontSize: 16, fontWeight: "600", textAlign: rtl ? "right" : "left" }}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: colors.border, true: colors.primary }} />
    </View>
  );
}

export default function NotificationSettingsScreen() {
  const { t } = useTranslation();
  const { colors, spacing, radius } = useTheme();
  const rtl = I18nManager.isRTL;
  const [tripUpdates, setTripUpdates] = useState(true);
  const [promos, setPromos] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: spacing.md }}>
      <Text style={{ color: colors.textMuted, marginBottom: spacing.md, fontSize: 14, lineHeight: 20, textAlign: rtl ? "right" : "left" }}>
        {t("notificationsLocalHint")}
      </Text>
      <Row
        label={t("notificationsTripUpdates")}
        value={tripUpdates}
        onValueChange={setTripUpdates}
        colors={colors}
        spacing={spacing}
        radius={radius}
        rtl={rtl}
      />
      <Row
        label={t("notificationsPromos")}
        value={promos}
        onValueChange={setPromos}
        colors={colors}
        spacing={spacing}
        radius={radius}
        rtl={rtl}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { borderWidth: 1 },
});
