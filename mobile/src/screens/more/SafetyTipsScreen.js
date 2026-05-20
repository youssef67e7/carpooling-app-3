import { Text, I18nManager } from "react-native";
import { useTranslation } from "react-i18next";
import { useWeretScreenChrome } from "../../hooks/useWeretScreenChrome";
import WeretInfoScreen from "../../components/ui/weret/WeretInfoScreen";

export default function SafetyTipsScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useWeretScreenChrome();
  const rtl = I18nManager.isRTL;
  const points = [t("safetyPoint1"), t("safetyPoint2"), t("safetyPoint3"), t("safetyPoint4")];

  return (
    <WeretInfoScreen title={t("featureSafety")} subtitle={t("safetyIntro")} colors={colors} spacing={spacing}>
      {points.map((p, i) => (
        <Text
          key={i}
          style={{
            color: colors.text,
            fontSize: 15,
            lineHeight: 24,
            marginBottom: spacing.sm,
            fontWeight: "500",
            textAlign: rtl ? "right" : "left",
          }}
        >
          {"• "}
          {p}
        </Text>
      ))}
    </WeretInfoScreen>
  );
}
