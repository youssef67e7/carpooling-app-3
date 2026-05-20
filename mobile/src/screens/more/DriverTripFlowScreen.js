import { Text, I18nManager } from "react-native";
import { useTranslation } from "react-i18next";
import { useWeretScreenChrome } from "../../hooks/useWeretScreenChrome";
import WeretInfoScreen from "../../components/ui/weret/WeretInfoScreen";

export default function DriverTripFlowScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useWeretScreenChrome();
  const rtl = I18nManager.isRTL;
  const steps = [t("driverFlowStep1"), t("driverFlowStep2"), t("driverFlowStep3"), t("driverFlowStep4"), t("driverFlowStep5")];

  return (
    <WeretInfoScreen title={t("featureDriverTripFlow")} subtitle={t("driverFlowIntro")} colors={colors} spacing={spacing}>
      {steps.map((s, i) => (
        <Text
          key={i}
          style={{
            color: colors.text,
            fontSize: 15,
            lineHeight: 26,
            marginBottom: spacing.md,
            fontWeight: "600",
            textAlign: rtl ? "right" : "left",
          }}
        >
          {i + 1}. {s}
        </Text>
      ))}
      <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 22, textAlign: rtl ? "right" : "left" }}>
        {t("driverFlowFooter")}
      </Text>
    </WeretInfoScreen>
  );
}
