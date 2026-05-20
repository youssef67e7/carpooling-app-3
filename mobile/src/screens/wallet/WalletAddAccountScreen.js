import { useState } from "react";
import { View, Text, Pressable, TextInput, I18nManager } from "react-native";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { useWeretScreenChrome } from "../../hooks/useWeretScreenChrome";
import { weretRadius } from "../../theme/weretDesignSystem";
import { WALLET_TYPES } from "../../constants/walletTypes";
import CustomButton from "../../components/CustomButton";
import SectionSurface from "../../components/ui/SectionSurface";
import FormErrorCallout from "../../components/ui/FormErrorCallout";
import WeretListScreen from "../../components/ui/weret/WeretListScreen";
import WeretStepHeader from "../../components/ui/weret/WeretStepHeader";
import { createWalletAccount, fetchWalletAccounts } from "../../store/slices/walletSlice";
import { showAlert } from "../../utils/showAlert";

export default function WalletAddAccountScreen({ navigation }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { colors, spacing } = useWeretScreenChrome();
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
    <WeretListScreen contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl * 2 }}>
      <WeretStepHeader title={t("walletAddMethod")} subtitle={t("walletSelectType")} colors={colors} spacing={spacing} />
      <View style={{ flexDirection: rtl ? "row-reverse" : "row", flexWrap: "wrap", marginBottom: spacing.md, gap: 8 }}>
        {WALLET_TYPES.map((wt) => (
          <Pressable
            key={wt}
            onPress={() => setWalletType(wt)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: weretRadius.pill,
              borderWidth: 1.5,
              borderColor: walletType === wt ? colors.text : colors.border,
              backgroundColor: walletType === wt ? colors.text : colors.surface,
            }}
          >
            <Text
              style={{
                color: walletType === wt ? colors.primaryText : colors.text,
                fontWeight: "800",
                fontSize: 13,
              }}
            >
              {t(`walletType_${wt}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      {walletType !== "cash" ? (
        <SectionSurface elevated noEntering style={{ marginBottom: spacing.md }}>
          <Text style={{ color: colors.textMuted, marginBottom: spacing.xs, fontWeight: "700", textAlign: rtl ? "right" : "left" }}>
            {t("walletPhoneMsisdn")}
          </Text>
          <TextInput
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            placeholder={t("phonePlaceholder")}
            placeholderTextColor={colors.textMuted}
            style={{
              borderWidth: 1.5,
              borderColor: colors.border,
              borderRadius: weretRadius.field,
              padding: spacing.md,
              color: colors.text,
              textAlign: rtl ? "right" : "left",
            }}
          />
        </SectionSurface>
      ) : null}

      <SectionSurface elevated noEntering style={{ marginBottom: spacing.md }}>
        <Text style={{ color: colors.textMuted, marginBottom: spacing.xs, fontWeight: "700", textAlign: rtl ? "right" : "left" }}>
          {t("walletOptionalLabel")}
        </Text>
        <TextInput
          value={label}
          onChangeText={setLabel}
          placeholder={t("walletOptionalLabelPh")}
          placeholderTextColor={colors.textMuted}
          style={{
            borderWidth: 1.5,
            borderColor: colors.border,
            borderRadius: weretRadius.field,
            padding: spacing.md,
            color: colors.text,
            textAlign: rtl ? "right" : "left",
          }}
        />
      </SectionSurface>

      <FormErrorCallout message={err} />
      <CustomButton title={t("walletSaveMethod")} variant="ink" onPress={onSave} loading={busy} disabled={busy} />
    </WeretListScreen>
  );
}
