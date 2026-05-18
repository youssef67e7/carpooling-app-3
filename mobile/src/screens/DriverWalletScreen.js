import { View, Text, Pressable, StyleSheet, I18nManager } from "react-native";
import { showAlert } from "../utils/showAlert";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { useWeretScreenChrome } from "../hooks/useWeretScreenChrome";
import { weretRadius } from "../theme/weretDesignSystem";

export default function DriverWalletScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { colors, spacing, radius } = useWeretScreenChrome();
  const rtl = I18nManager.isRTL;
  const pillBg = colors.accentLime;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, padding: spacing.md }]}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
        <View style={[styles.cardHead, { flexDirection: rtl ? "row-reverse" : "row" }]}>
          <View style={[styles.coinIcon, { backgroundColor: pillBg }]}>
            <MaterialCommunityIcons name="cash-multiple" size={22} color={colors.accentLimeText} />
          </View>
          <Text style={{ color: colors.text, fontWeight: "800", fontSize: 16 }}>{t("driverWalletBalance")}</Text>
          <Pressable hitSlop={12} onPress={() => showAlert(t("driverWalletBalance"), t("driverWalletHelp"))}>
            <MaterialCommunityIcons name="help-circle-outline" size={22} color={colors.textMuted} />
          </Pressable>
        </View>
        <Text style={[styles.amount, { color: colors.text, textAlign: rtl ? "right" : "left" }]}>0</Text>
        <Pressable
          style={[styles.topUp, { backgroundColor: pillBg, borderRadius: weretRadius.pill }]}
          onPress={() => showAlert(t("driverWalletTopUp"), t("driverFeatureSoon"))}
        >
          <Text style={{ color: colors.accentLimeText, fontWeight: "800", fontSize: 16 }}>{t("driverWalletTopUp")}</Text>
        </Pressable>
        <Pressable style={[styles.rowLink, { flexDirection: rtl ? "row-reverse" : "row" }]}>
          <MaterialCommunityIcons name={rtl ? "chevron-left" : "chevron-right"} size={22} color={colors.textMuted} />
        </Pressable>
      </View>

      <Pressable
        style={[
          styles.card,
          {
            marginTop: spacing.md,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.lg,
            flexDirection: rtl ? "row-reverse" : "row",
            alignItems: "center",
            padding: spacing.md,
          },
        ]}
        onPress={() => navigation.navigate("DriverPaymentMethods")}
      >
        <MaterialCommunityIcons name="credit-card-outline" size={26} color={colors.text} />
        <Text style={{ flex: 1, color: colors.text, fontWeight: "700", textAlign: rtl ? "right" : "left", marginHorizontal: 12 }}>
          {t("driverWalletPayments")}
        </Text>
        <MaterialCommunityIcons name={rtl ? "chevron-left" : "chevron-right"} size={22} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  card: { borderWidth: 1, padding: 16 },
  cardHead: { alignItems: "center", justifyContent: "space-between" },
  coinIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  amount: { fontSize: 36, fontWeight: "800", marginTop: 12 },
  topUp: { marginTop: 16, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  rowLink: { marginTop: 8, justifyContent: "flex-end" },
});
