import { Text, I18nManager } from "react-native";
import { useTranslation } from "react-i18next";
import { useWeretScreenChrome } from "../../hooks/useWeretScreenChrome";
import WeretInfoScreen from "../../components/ui/weret/WeretInfoScreen";

export default function DriverDemandScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useWeretScreenChrome();
  const rtl = I18nManager.isRTL;
  const align = rtl ? "right" : "left";

  return (
    <WeretInfoScreen title={t("driverDemandTitle")} subtitle={t("driverDemandIntro")} colors={colors} spacing={spacing}>
      <Text style={{ color: colors.text, fontSize: 15, lineHeight: 24, textAlign: align }}>{t("driverDemandBody1")}</Text>
      <Text style={{ color: colors.text, fontSize: 15, lineHeight: 24, marginTop: spacing.md, textAlign: align }}>
        {t("driverDemandBody2")}
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 21, marginTop: spacing.lg, textAlign: align }}>
        {t("driverDemandFooter")}
      </Text>
    </WeretInfoScreen>
  );
}
