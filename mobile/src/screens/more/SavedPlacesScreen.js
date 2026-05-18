import { View, Text, I18nManager } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../context/ThemeProvider";

export default function SavedPlacesScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const rtl = I18nManager.isRTL;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: spacing.md, justifyContent: "center" }}>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700", textAlign: rtl ? "right" : "left", marginBottom: spacing.sm }}>
        {t("featureSavedPlaces")}
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22, textAlign: rtl ? "right" : "left" }}>{t("savedIntro")}</Text>
      <Text style={{ color: colors.textMuted, fontSize: 14, marginTop: spacing.md, textAlign: rtl ? "right" : "left" }}>{t("savedEmpty")}</Text>
    </View>
  );
}
