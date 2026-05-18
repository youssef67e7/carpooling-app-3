import { ScrollView, Text, View, I18nManager } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../context/ThemeProvider";

function Block({ title, body, colors, spacing, rtl }) {
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={{ color: colors.text, fontWeight: "700", fontSize: 16, textAlign: rtl ? "right" : "left" }}>{title}</Text>
      <Text style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22, textAlign: rtl ? "right" : "left", marginTop: spacing.xs }}>
        {body}
      </Text>
    </View>
  );
}

export default function HelpCenterScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const rtl = I18nManager.isRTL;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
      <Text style={{ color: colors.textMuted, marginBottom: spacing.md, textAlign: rtl ? "right" : "left", fontSize: 15, lineHeight: 22 }}>
        {t("helpIntro")}
      </Text>
      <Block title={t("helpQ1")} body={t("helpA1")} colors={colors} spacing={spacing} rtl={rtl} />
      <Block title={t("helpQ2")} body={t("helpA2")} colors={colors} spacing={spacing} rtl={rtl} />
      <Block title={t("helpQ3")} body={t("helpA3")} colors={colors} spacing={spacing} rtl={rtl} />
    </ScrollView>
  );
}
