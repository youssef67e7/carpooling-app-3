import { useState } from "react";
import { View, Text, Pressable, ScrollView, TextInput, I18nManager } from "react-native";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { useTheme } from "../../context/ThemeProvider";
import { WALLET_TYPES } from "../../constants/walletTypes";
import CustomButton from "../../components/CustomButton";
import SectionSurface from "../../components/ui/SectionSurface";
import FormErrorCallout from "../../components/ui/FormErrorCallout";
import { createWalletAccount, fetchWalletAccounts } from "../../store/slices/walletSlice";
import { showAlert } from "../../utils/showAlert";

export default function WalletAddAccountScreen({ navigation }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { colors, spacing, radius } = useTheme();
  const rtl = I18nManager.isRTL;
  const [walletType, setWalletType] = useState("vodafone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function onSave() {
    setErr(null);
    setBusy(true);
    try {
      await dispatch(
        createWalletAccount({
          walletType,
          phoneNumber: walletType === "cash" ? "" : phoneNumber.trim(),
          label: label.trim(),
        })
      ).unwrap();
      await dispatch(fetchWalletAccounts());
      showAlert(t("success"), t("walletMethodAdded"));
      navigation.goBack();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md }}>
      <Text style={{ color: colors.textMuted, marginBottom: spacing.sm, textAlign: rtl ? "right" : "left" }}>
        {t("walletSelectType")}
      </Text>
      <View style={{ flexDirection: rtl ? "row-reverse" : "row", flexWrap: "wrap", marginBottom: spacing.md }}>
        {WALLET_TYPES.map((wt) => (
          <Pressable
            key={wt}
            onPress={() => setWalletType(wt)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: radius.full,
              marginEnd: 8,
              marginBottom: 8,
              borderWidth: 1,
              borderColor: walletType === wt ? colors.primary : colors.border,
              backgroundColor: walletType === wt ? colors.primarySoft || colors.surfaceMuted : colors.surface,
            }}
          >
            <Text style={{ color: colors.text, fontWeight: walletType === wt ? "800" : "500", fontSize: 13 }}>
              {t(`walletType_${wt}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      {walletType !== "cash" ? (
        <SectionSurface noEntering style={{ marginBottom: spacing.md }}>
          <Text style={{ color: colors.textMuted, marginBottom: spacing.xs, textAlign: rtl ? "right" : "left" }}>
            {t("walletPhoneMsisdn")}
          </Text>
          <TextInput
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            placeholder={t("phonePlaceholder")}
            placeholderTextColor={colors.textMuted}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: spacing.md,
              color: colors.text,
              textAlign: rtl ? "right" : "left",
            }}
          />
        </SectionSurface>
      ) : null}

      <SectionSurface noEntering style={{ marginBottom: spacing.md }}>
        <Text style={{ color: colors.textMuted, marginBottom: spacing.xs, textAlign: rtl ? "right" : "left" }}>
          {t("walletOptionalLabel")}
        </Text>
        <TextInput
          value={label}
          onChangeText={setLabel}
          placeholder={t("walletOptionalLabelPh")}
          placeholderTextColor={colors.textMuted}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.md,
            padding: spacing.md,
            color: colors.text,
            textAlign: rtl ? "right" : "left",
          }}
        />
      </SectionSurface>

      <FormErrorCallout message={err} />
      <CustomButton title={t("walletSaveMethod")} onPress={onSave} loading={busy} disabled={busy} />
    </ScrollView>
  );
}
