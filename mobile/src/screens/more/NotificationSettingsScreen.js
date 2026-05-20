import { useState } from "react";
import { View, Text, Switch, I18nManager, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useWeretScreenChrome } from "../../hooks/useWeretScreenChrome";
import { weretElevation, weretRadius } from "../../theme/weretDesignSystem";
import WeretListScreen from "../../components/ui/weret/WeretListScreen";
import WeretStepHeader from "../../components/ui/weret/WeretStepHeader";

function Row({ label, value, onValueChange, colors, spacing, rtl }) {
  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: weretRadius.card,
          padding: spacing.md,
          marginBottom: spacing.sm,
          flexDirection: rtl ? "row-reverse" : "row",
          alignItems: "center",
          ...weretElevation.card,
        },
      ]}
    >
      <Text style={{ flex: 1, color: colors.text, fontSize: 16, fontWeight: "800", textAlign: rtl ? "right" : "left" }}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: colors.border, true: colors.text }} thumbColor={colors.surface} />
    </View>
  );
}

export default function NotificationSettingsScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useWeretScreenChrome();
  const rtl = I18nManager.isRTL;
  const [tripUpdates, setTripUpdates] = useState(true);
  const [promos, setPromos] = useState(false);

  return (
    <WeretListScreen contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl * 2 }}>
      <WeretStepHeader title={t("featureNotifications")} subtitle={t("notificationsLocalHint")} colors={colors} spacing={spacing} />
      <Row label={t("notificationsTripUpdates")} value={tripUpdates} onValueChange={setTripUpdates} colors={colors} spacing={spacing} rtl={rtl} />
      <Row label={t("notificationsPromos")} value={promos} onValueChange={setPromos} colors={colors} spacing={spacing} rtl={rtl} />
    </WeretListScreen>
  );
}

const styles = StyleSheet.create({
  row: { borderWidth: 1 },
});
