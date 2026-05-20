import { Text, I18nManager } from "react-native";
import { useTranslation } from "react-i18next";
import { useWeretScreenChrome } from "../../hooks/useWeretScreenChrome";
import WeretInfoScreen from "../../components/ui/weret/WeretInfoScreen";

export default function RideTipsScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useWeretScreenChrome();
  const rtl = I18nManager.isRTL;
  const steps = [t("rideTip1"), t("rideTip2"), t("rideTip3"), t("rideTip4")];

  return (
    <WeretInfoScreen title={t("featureRideTips")} subtitle={t("rideTipsIntro")} colors={colors} spacing={spacing}>
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
    </WeretInfoScreen>
  );
}
