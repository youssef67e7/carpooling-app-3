import { ScrollView, Text, I18nManager } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../context/ThemeProvider";

export default function AdminToolsScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const rtl = I18nManager.isRTL;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
      <Text style={{ color: colors.text, fontSize: 17, fontWeight: "700", marginBottom: spacing.sm, textAlign: rtl ? "right" : "left" }}>
        {t("adminToolsTitle")}
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22, textAlign: rtl ? "right" : "left" }}>{t("adminToolsIntro")}</Text>
      <Text style={{ color: colors.text, fontSize: 15, lineHeight: 24, marginTop: spacing.lg, textAlign: rtl ? "right" : "left" }}>
        {t("adminToolsBody")}
      </Text>
    </ScrollView>
  );
}
