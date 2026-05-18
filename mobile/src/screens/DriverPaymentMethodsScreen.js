import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, I18nManager } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useWeretScreenChrome } from "../hooks/useWeretScreenChrome";

const METHODS = [
  { id: "paypal", icon: "wallet-outline", iconLib: "MaterialCommunityIcons", labelKey: "paymentMethodPayPal" },
  { id: "stripe", icon: "credit-card-multiple-outline", iconLib: "MaterialCommunityIcons", labelKey: "paymentMethodStripe" },
  { id: "instapay", icon: "bank-outline", iconLib: "MaterialCommunityIcons", labelKey: "paymentMethodInstaPay" },
  { id: "vodafone", icon: "cellphone", iconLib: "MaterialCommunityIcons", labelKey: "paymentMethodVodafoneCash" },
  { id: "etisalat", icon: "sim-outline", iconLib: "MaterialCommunityIcons", labelKey: "paymentMethodEtisalatCash" },
];

export default function DriverPaymentMethodsScreen() {
  const { t } = useTranslation();
  const { colors, spacing, radius } = useWeretScreenChrome();
  const rtl = I18nManager.isRTL;
  const [selectedId, setSelectedId] = useState("stripe");

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
      <Text style={{ color: colors.textMuted, fontSize: 14, marginBottom: spacing.md, textAlign: rtl ? "right" : "left" }}>
        {t("paymentMethodsIntro")}
      </Text>
      {METHODS.map((m) => {
        const sel = selectedId === m.id;
        return (
          <Pressable
            key={m.id}
            onPress={() => setSelectedId(m.id)}
            style={[
              styles.rowBase,
              {
                borderColor: sel ? colors.primary : colors.border,
                backgroundColor: colors.surface,
                borderRadius: radius.md,
                flexDirection: rtl ? "row-reverse" : "row",
                marginBottom: spacing.sm,
                padding: spacing.md,
              },
            ]}
          >
            <MaterialCommunityIcons name={m.icon} size={28} color={sel ? colors.primary : colors.text} />
            <Text style={{ flex: 1, color: colors.text, fontWeight: "700", fontSize: 16, textAlign: rtl ? "right" : "left", marginHorizontal: 12 }}>
              {t(m.labelKey)}
            </Text>
            {sel ? <MaterialCommunityIcons name="check-circle" size={24} color={colors.success} /> : null}
          </Pressable>
        );
      })}
      <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: spacing.md, textAlign: rtl ? "right" : "left", lineHeight: 18 }}>
        {t("paymentMethodsFooter")}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  rowBase: {
    alignItems: "center",
    borderWidth: 1,
  },
});
