import { Text, I18nManager } from "react-native";
import { useTranslation } from "react-i18next";
import { useWeretScreenChrome } from "../../hooks/useWeretScreenChrome";
import WeretInfoScreen from "../../components/ui/weret/WeretInfoScreen";

export default function DriverEarningsScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useWeretScreenChrome();
  const rtl = I18nManager.isRTL;
  const align = rtl ? "right" : "left";

  return (
    <WeretInfoScreen title={t("driverEarningsTitle")} subtitle={t("driverEarningsIntro")} colors={colors} spacing={spacing}>
      <Text style={{ color: colors.text, fontSize: 15, lineHeight: 24, textAlign: align, fontWeight: "500" }}>{t("driverEarningsBody1")}</Text>
      <Text style={{ color: colors.text, fontSize: 15, lineHeight: 24, marginTop: spacing.md, textAlign: align, fontWeight: "500" }}>
        {t("driverEarningsBody2")}
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 21, marginTop: spacing.lg, textAlign: align }}>
        {t("driverEarningsFooter")}
      </Text>
    </WeretInfoScreen>
  );
}
