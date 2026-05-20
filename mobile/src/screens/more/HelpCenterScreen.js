import { Text, View, I18nManager } from "react-native";
import { useTranslation } from "react-i18next";
import { useWeretScreenChrome } from "../../hooks/useWeretScreenChrome";
import WeretListScreen from "../../components/ui/weret/WeretListScreen";
import WeretStepHeader from "../../components/ui/weret/WeretStepHeader";
import SectionSurface from "../../components/ui/SectionSurface";

function FaqBlock({ title, body, colors, spacing, rtl }) {
  return (
    <SectionSurface noEntering style={{ marginBottom: spacing.sm }}>
      <Text style={{ color: colors.text, fontWeight: "800", fontSize: 16, textAlign: rtl ? "right" : "left", letterSpacing: -0.2 }}>
        {title}
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 22, textAlign: rtl ? "right" : "left", marginTop: spacing.sm }}>
        {body}
      </Text>
    </SectionSurface>
  );
}

export default function HelpCenterScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useWeretScreenChrome();
  const rtl = I18nManager.isRTL;

  return (
    <WeretListScreen contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl * 2 }}>
      <WeretStepHeader title={t("featureHelp")} subtitle={t("helpIntro")} colors={colors} spacing={spacing} />
      <FaqBlock title={t("helpQ1")} body={t("helpA1")} colors={colors} spacing={spacing} rtl={rtl} />
      <FaqBlock title={t("helpQ2")} body={t("helpA2")} colors={colors} spacing={spacing} rtl={rtl} />
      <FaqBlock title={t("helpQ3")} body={t("helpA3")} colors={colors} spacing={spacing} rtl={rtl} />
    </WeretListScreen>
  );
}
