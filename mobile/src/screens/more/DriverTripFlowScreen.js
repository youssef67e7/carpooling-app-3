import { ScrollView, Text, I18nManager } from "react-native";
import { useTranslation } from "react-i18next";
import { useWeretScreenChrome } from "../../hooks/useWeretScreenChrome";

export default function DriverTripFlowScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useWeretScreenChrome();
  const rtl = I18nManager.isRTL;
  const steps = [t("driverFlowStep1"), t("driverFlowStep2"), t("driverFlowStep3"), t("driverFlowStep4"), t("driverFlowStep5")];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
      <Text style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22, textAlign: rtl ? "right" : "left", marginBottom: spacing.md }}>
        {t("driverFlowIntro")}
      </Text>
      {steps.map((s, i) => (
        <Text
          key={i}
          style={{
            color: colors.text,
            fontSize: 15,
            lineHeight: 24,
            marginBottom: spacing.md,
            textAlign: rtl ? "right" : "left",
          }}
        >
          {i + 1}. {s}
        </Text>
      ))}
      <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20, textAlign: rtl ? "right" : "left", marginTop: spacing.sm }}>
        {t("driverFlowFooter")}
      </Text>
    </ScrollView>
  );
}
