import { Text, I18nManager } from "react-native";
import Constants from "expo-constants";
import { useTranslation } from "react-i18next";
import { useWeretScreenChrome } from "../../hooks/useWeretScreenChrome";
import WeretInfoScreen from "../../components/ui/weret/WeretInfoScreen";

export default function AboutAmeenScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useWeretScreenChrome();
  const rtl = I18nManager.isRTL;
  const version = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <WeretInfoScreen title={t("appName")} subtitle={t("aboutVersion", { version })} colors={colors} spacing={spacing}>
      <Text style={{ color: colors.text, fontSize: 16, lineHeight: 24, fontWeight: "600", textAlign: rtl ? "right" : "left" }}>
        {t("aboutTagline")}
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: 15, lineHeight: 24, marginTop: spacing.md, textAlign: rtl ? "right" : "left" }}>
        {t("aboutBody")}
      </Text>
    </WeretInfoScreen>
  );
}
