import { ScrollView, Text, View, I18nManager, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useWeretScreenChrome } from "../../hooks/useWeretScreenChrome";

function CheckRow({ label, statusLabel, ok, colors, spacing, radius, rtl }) {
  return (
    <View
      style={[
        styles.row,
        {
          borderColor: colors.border,
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          padding: spacing.md,
          marginBottom: spacing.sm,
          flexDirection: rtl ? "row-reverse" : "row",
          alignItems: "center",
        },
      ]}
    >
      <Text style={{ flex: 1, color: colors.text, fontSize: 15, textAlign: rtl ? "right" : "left" }}>{label}</Text>
      <Text style={{ color: ok ? colors.success : colors.textMuted, fontWeight: "700", fontSize: 13 }}>{statusLabel}</Text>
    </View>
  );
}

export default function DriverVehicleScreen() {
  const { t } = useTranslation();
  const { colors, spacing, radius } = useWeretScreenChrome();
  const rtl = I18nManager.isRTL;
  const soon = t("driverVehicleSoon");
  const items = [
    { key: "driverVehiclePlate", ok: false },
    { key: "driverVehicleModel", ok: false },
    { key: "driverVehicleInsurance", ok: false },
    { key: "driverVehicleLicense", ok: false },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
      <Text style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22, textAlign: rtl ? "right" : "left", marginBottom: spacing.md }}>
        {t("driverVehicleIntro")}
      </Text>
      {items.map((row) => (
        <CheckRow
          key={row.key}
          label={t(row.key)}
          statusLabel={row.ok ? t("driverVehicleOk") : soon}
          ok={row.ok}
          colors={colors}
          spacing={spacing}
          radius={radius}
          rtl={rtl}
        />
      ))}
      <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: spacing.md, textAlign: rtl ? "right" : "left" }}>
        {t("driverVehicleFooter")}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { borderWidth: 1 },
});
