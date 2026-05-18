import { ScrollView, Text, I18nManager } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../context/ThemeProvider";

export default function RideTipsScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const rtl = I18nManager.isRTL;
  const steps = [t("rideTip1"), t("rideTip2"), t("rideTip3"), t("rideTip4")];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
      <Text style={{ color: colors.textMuted, marginBottom: spacing.md, fontSize: 15, lineHeight: 22, textAlign: rtl ? "right" : "left" }}>
        {t("rideTipsIntro")}
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
    </ScrollView>
  );
}
