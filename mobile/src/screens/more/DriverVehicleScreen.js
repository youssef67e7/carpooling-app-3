import { Text, View, I18nManager, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useWeretScreenChrome } from "../../hooks/useWeretScreenChrome";
import { weretRadius, weretElevation } from "../../theme/weretDesignSystem";
import WeretListScreen from "../../components/ui/weret/WeretListScreen";
import WeretStepHeader from "../../components/ui/weret/WeretStepHeader";

function CheckRow({ label, statusLabel, ok, colors, spacing, rtl }) {
  return (
    <View
      style={[
        styles.row,
        {
          borderColor: colors.border,
          backgroundColor: colors.surface,
          borderRadius: weretRadius.card,
          padding: spacing.md,
          marginBottom: spacing.sm,
          flexDirection: rtl ? "row-reverse" : "row",
          alignItems: "center",
          ...weretElevation.card,
        },
      ]}
    >
      <Text style={{ flex: 1, color: colors.text, fontSize: 15, fontWeight: "700", textAlign: rtl ? "right" : "left" }}>{label}</Text>
      <Text style={{ color: ok ? colors.success : colors.textMuted, fontWeight: "800", fontSize: 13 }}>{statusLabel}</Text>
    </View>
  );
}

export default function DriverVehicleScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useWeretScreenChrome();
  const rtl = I18nManager.isRTL;
  const soon = t("driverVehicleSoon");
  const items = [
    { key: "driverVehiclePlate", ok: false },
    { key: "driverVehicleModel", ok: false },
    { key: "driverVehicleInsurance", ok: false },
    { key: "driverVehicleLicense", ok: false },
  ];

  return (
    <WeretListScreen contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl * 2 }}>
      <WeretStepHeader title={t("featureDriverVehicle")} subtitle={t("driverVehicleIntro")} colors={colors} spacing={spacing} />
      {items.map((row) => (
        <CheckRow
          key={row.key}
          label={t(row.key)}
          statusLabel={row.ok ? t("driverVehicleOk") : soon}
          ok={row.ok}
          colors={colors}
          spacing={spacing}
          rtl={rtl}
        />
      ))}
      <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 22, marginTop: spacing.sm, textAlign: rtl ? "right" : "left" }}>
        {t("driverVehicleFooter")}
      </Text>
    </WeretListScreen>
  );
}

const styles = StyleSheet.create({
  row: { borderWidth: 1 },
});
