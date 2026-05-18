import { ScrollView, Text, I18nManager } from "react-native";
import Constants from "expo-constants";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../context/ThemeProvider";

export default function AboutAmeenScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const rtl = I18nManager.isRTL;
  const version = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: "800", textAlign: rtl ? "right" : "left", marginBottom: spacing.xs }}>
        {t("appName")}
      </Text>
      <Text style={{ color: colors.textMuted, marginBottom: spacing.lg, textAlign: rtl ? "right" : "left" }}>
        {t("aboutVersion", { version })}
      </Text>
      <Text style={{ color: colors.text, fontSize: 16, lineHeight: 24, textAlign: rtl ? "right" : "left" }}>{t("aboutTagline")}</Text>
      <Text style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22, marginTop: spacing.md, textAlign: rtl ? "right" : "left" }}>
        {t("aboutBody")}
      </Text>
    </ScrollView>
  );
}
