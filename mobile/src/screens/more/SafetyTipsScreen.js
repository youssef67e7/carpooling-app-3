import { ScrollView, Text, I18nManager } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../context/ThemeProvider";

export default function SafetyTipsScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const rtl = I18nManager.isRTL;
  const points = [t("safetyPoint1"), t("safetyPoint2"), t("safetyPoint3"), t("safetyPoint4")];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
      <Text style={{ color: colors.textMuted, marginBottom: spacing.md, fontSize: 15, lineHeight: 22, textAlign: rtl ? "right" : "left" }}>
        {t("safetyIntro")}
      </Text>
      {points.map((p, i) => (
        <Text
          key={i}
          style={{
            color: colors.text,
            fontSize: 15,
            lineHeight: 24,
            marginBottom: spacing.sm,
            textAlign: rtl ? "right" : "left",
          }}
        >
          {"• "}
          {p}
        </Text>
      ))}
    </ScrollView>
  );
}
