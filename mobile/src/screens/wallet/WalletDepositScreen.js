import { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, I18nManager } from "react-native";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { useWeretScreenChrome } from "../../hooks/useWeretScreenChrome";
import SectionSurface from "../../components/ui/SectionSurface";
import CustomButton from "../../components/CustomButton";
import FormErrorCallout from "../../components/ui/FormErrorCallout";
import WeretListScreen from "../../components/ui/weret/WeretListScreen";
import WeretStepHeader from "../../components/ui/weret/WeretStepHeader";
import { depositWallet, fetchWalletAccounts } from "../../store/slices/walletSlice";
import { showAlert } from "../../utils/showAlert";

export default function WalletDepositScreen({ navigation }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { colors, spacing, radius } = useWeretScreenChrome();
  const rtl = I18nManager.isRTL;
  const { accounts } = useSelector((s) => s.wallet);
  const [accountId, setAccountId] = useState(accounts[0]?._id || "");
  const [amount, setAmount] = useState("25");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!accountId && accounts[0]?._id) setAccountId(accounts[0]._id);
  }, [accounts, accountId]);

  async function onDeposit() {
    setErr(null);
    if (!accountId) {
      setErr(t("walletPickAccountFirst"));
      return;
    }
    setBusy(true);
    try {
      await dispatch(depositWallet({ walletAccountId: accountId, amount })).unwrap();
      await dispatch(fetchWalletAccounts());
      showAlert(t("success"), t("walletDepositDone"));
      navigation.goBack();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <WeretListScreen contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl * 2 }}>
      <WeretStepHeader title={t("walletAddMoney")} subtitle={t("walletSimulatedDisclaimer")} colors={colors} spacing={spacing} />
      <Text style={{ color: colors.textMuted, marginBottom: spacing.sm, fontWeight: "700", textAlign: rtl ? "right" : "left" }}>
        {t("walletPickAccount")}
      </Text>
      {accounts.map((a) => (
        <Pressable
          key={a._id}
          onPress={() => setAccountId(a._id)}
          style={{
            padding: spacing.md,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: accountId === a._id ? colors.primary : colors.border,
            backgroundColor: colors.surface,
            marginBottom: spacing.sm,
          }}
        >
          <Text style={{ color: colors.text, fontWeight: "700", textAlign: rtl ? "right" : "left" }}>
            {t(`walletType_${a.walletType}`)} · {Number(a.balance || 0).toFixed(2)}
          </Text>
        </Pressable>
      ))}

      <SectionSurface noEntering style={{ marginTop: spacing.md }}>
        <Text style={{ color: colors.textMuted, marginBottom: spacing.xs, textAlign: rtl ? "right" : "left" }}>
          {t("walletAmount")}
        </Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.md,
            padding: spacing.md,
            fontSize: 20,
            fontWeight: "800",
            color: colors.text,
            textAlign: rtl ? "right" : "left",
          }}
        />
      </SectionSurface>

      <FormErrorCallout message={err} />
      <CustomButton title={t("walletAddMoney")} variant="ink" onPress={onDeposit} loading={busy} disabled={busy} />
    </WeretListScreen>
  );
}
