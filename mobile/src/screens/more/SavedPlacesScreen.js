import { Text, I18nManager } from "react-native";
import { useTranslation } from "react-i18next";
import { useWeretScreenChrome } from "../../hooks/useWeretScreenChrome";
import WeretInfoScreen from "../../components/ui/weret/WeretInfoScreen";

export default function SavedPlacesScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useWeretScreenChrome();
  const rtl = I18nManager.isRTL;

  return (
    <WeretInfoScreen title={t("featureSavedPlaces")} subtitle={t("savedIntro")} colors={colors} spacing={spacing}>
      <Text style={{ color: colors.textMuted, fontSize: 15, lineHeight: 24, textAlign: rtl ? "right" : "left" }}>{t("savedEmpty")}</Text>
    </WeretInfoScreen>
  );
}
