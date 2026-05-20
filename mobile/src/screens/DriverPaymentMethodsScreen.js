import { useState } from "react";
import { View, Text, Pressable, StyleSheet, I18nManager } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useWeretScreenChrome } from "../hooks/useWeretScreenChrome";
import { weretRadius, weretElevation } from "../theme/weretDesignSystem";
import WeretListScreen from "../components/ui/weret/WeretListScreen";
import WeretStepHeader from "../components/ui/weret/WeretStepHeader";

const METHODS = [
  { id: "paypal", icon: "wallet-outline", labelKey: "paymentMethodPayPal" },
  { id: "stripe", icon: "credit-card-multiple-outline", labelKey: "paymentMethodStripe" },
  { id: "instapay", icon: "bank-outline", labelKey: "paymentMethodInstaPay" },
  { id: "vodafone", icon: "cellphone", labelKey: "paymentMethodVodafoneCash" },
  { id: "etisalat", icon: "sim-outline", labelKey: "paymentMethodEtisalatCash" },
];

export default function DriverPaymentMethodsScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useWeretScreenChrome();
  const rtl = I18nManager.isRTL;
  const [selectedId, setSelectedId] = useState("stripe");

  return (
    <WeretListScreen contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl * 2 }}>
      <WeretStepHeader title={t("driverWalletPayments")} subtitle={t("paymentMethodsIntro")} colors={colors} spacing={spacing} />
      {METHODS.map((m) => {
        const sel = selectedId === m.id;
        return (
          <Pressable
            key={m.id}
            onPress={() => setSelectedId(m.id)}
            style={[
              styles.rowBase,
              {
                borderColor: sel ? colors.text : colors.border,
                backgroundColor: colors.surface,
                borderRadius: weretRadius.card,
                flexDirection: rtl ? "row-reverse" : "row",
                marginBottom: spacing.sm,
                padding: spacing.md,
                borderWidth: sel ? 2 : 1,
                ...weretElevation.card,
              },
            ]}
          >
            <MaterialCommunityIcons name={m.icon} size={28} color={colors.text} />
            <Text style={{ flex: 1, color: colors.text, fontWeight: "800", fontSize: 16, textAlign: rtl ? "right" : "left", marginHorizontal: 12 }}>
              {t(m.labelKey)}
            </Text>
            {sel ? <MaterialCommunityIcons name="check-circle" size={24} color={colors.text} /> : null}
          </Pressable>
        );
      })}
    </WeretListScreen>
  );
}

const styles = StyleSheet.create({
  rowBase: { alignItems: "center" },
});
