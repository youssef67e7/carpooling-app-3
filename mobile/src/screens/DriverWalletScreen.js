import { View, Text, Pressable, StyleSheet, I18nManager } from "react-native";
import { showAlert } from "../utils/showAlert";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { useWeretScreenChrome } from "../hooks/useWeretScreenChrome";
import { weretRadius, weretElevation } from "../theme/weretDesignSystem";
import WeretListScreen from "../components/ui/weret/WeretListScreen";
import WeretStepHeader from "../components/ui/weret/WeretStepHeader";
import SectionSurface from "../components/ui/SectionSurface";

export default function DriverWalletScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { colors, spacing, radius } = useWeretScreenChrome();
  const rtl = I18nManager.isRTL;

  return (
    <WeretListScreen contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl * 2 }}>
      <WeretStepHeader title={t("driverWalletBalance")} subtitle={t("driverWalletHelp")} colors={colors} spacing={spacing} />

      <SectionSurface elevated noEntering style={{ marginBottom: spacing.md }}>
        <View style={[styles.cardHead, { flexDirection: rtl ? "row-reverse" : "row" }]}>
          <View style={[styles.coinIcon, { backgroundColor: colors.text }]}>
            <MaterialCommunityIcons name="cash-multiple" size={22} color={colors.primaryText} />
          </View>
          <Text style={{ color: colors.text, fontWeight: "900", fontSize: 16 }}>{t("driverWalletBalance")}</Text>
          <Pressable hitSlop={12} onPress={() => showAlert(t("driverWalletBalance"), t("driverWalletHelp"))}>
            <MaterialCommunityIcons name="help-circle-outline" size={22} color={colors.textMuted} />
          </Pressable>
        </View>
        <Text style={[styles.amount, { color: colors.text, textAlign: rtl ? "right" : "left" }]}>0</Text>
        <Pressable
          style={[styles.topUp, { backgroundColor: colors.text, borderRadius: weretRadius.pill }]}
          onPress={() => showAlert(t("driverWalletTopUp"), t("driverFeatureSoon"))}
        >
          <Text style={{ color: colors.primaryText, fontWeight: "800", fontSize: 16 }}>{t("driverWalletTopUp")}</Text>
        </Pressable>
      </SectionSurface>

      <Pressable
        style={[
          styles.rowCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.lg,
            flexDirection: rtl ? "row-reverse" : "row",
            padding: spacing.md,
            ...weretElevation.card,
          },
        ]}
        onPress={() => navigation.navigate("DriverPaymentMethods")}
      >
        <MaterialCommunityIcons name="credit-card-outline" size={26} color={colors.text} />
        <Text style={{ flex: 1, color: colors.text, fontWeight: "800", textAlign: rtl ? "right" : "left", marginHorizontal: 12 }}>
          {t("driverWalletPayments")}
        </Text>
        <MaterialCommunityIcons name={rtl ? "chevron-left" : "chevron-right"} size={22} color={colors.textMuted} />
      </Pressable>
    </WeretListScreen>
  );
}

const styles = StyleSheet.create({
  cardHead: { alignItems: "center", justifyContent: "space-between" },
  coinIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  amount: { fontSize: 36, fontWeight: "900", marginTop: 12, letterSpacing: -1 },
  topUp: { marginTop: 16, paddingVertical: 14, alignItems: "center" },
  rowCard: { borderWidth: 1, alignItems: "center" },
});
