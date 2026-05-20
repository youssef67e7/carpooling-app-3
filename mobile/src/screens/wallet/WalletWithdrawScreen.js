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
import {
  requestWithdraw,
  confirmWithdraw,
  fetchWalletAccounts,
  fetchWalletTransactions,
  clearWithdrawMeta,
} from "../../store/slices/walletSlice";
import { showAlert } from "../../utils/showAlert";

export default function WalletWithdrawScreen({ navigation }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { colors, spacing, radius } = useWeretScreenChrome();
  const rtl = I18nManager.isRTL;
  const { accounts, lastWithdrawMeta } = useSelector((s) => s.wallet);
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (accounts.length && !accountId) setAccountId(accounts[0]._id);
  }, [accounts, accountId]);

  useEffect(() => {
    return () => {
      dispatch(clearWithdrawMeta());
    };
  }, [dispatch]);

  async function onRequest() {
    setErr(null);
    if (!accountId || !amount) {
      setErr(t("walletFillFields"));
      return;
    }
    setBusy(true);
    try {
      await dispatch(requestWithdraw({ walletAccountId: accountId, amount })).unwrap();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onConfirm() {
    setErr(null);
    if (!lastWithdrawMeta?.requestId || !otp.trim()) {
      setErr(t("walletEnterOtp"));
      return;
    }
    setBusy(true);
    try {
      await dispatch(
        confirmWithdraw({ requestId: lastWithdrawMeta.requestId, otp: otp.trim() })
      ).unwrap();
      await dispatch(fetchWalletAccounts());
      await dispatch(fetchWalletTransactions());
      dispatch(clearWithdrawMeta());
      showAlert(t("success"), t("walletWithdrawDone"));
      navigation.goBack();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <WeretListScreen contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl * 2 }}>
      <WeretStepHeader
        title={t("walletWithdraw")}
        subtitle={lastWithdrawMeta ? t("walletEnterOtp") : t("walletSimulatedDisclaimer")}
        colors={colors}
        spacing={spacing}
      />
      {!lastWithdrawMeta ? (
        <>
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
                color: colors.text,
                textAlign: rtl ? "right" : "left",
              }}
            />
          </SectionSurface>
          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: spacing.sm, textAlign: rtl ? "right" : "left" }}>
            {t("walletWithdrawOtpHint")}
          </Text>
          <FormErrorCallout message={err} />
          <CustomButton title={t("walletSendCode")} onPress={onRequest} loading={busy} disabled={busy} />
        </>
      ) : (
        <>
          <SectionSurface noEntering>
            <Text style={{ color: colors.text, fontWeight: "700", textAlign: rtl ? "right" : "left" }}>
              {t("walletEnterOtpTitle")}
            </Text>
            {lastWithdrawMeta.devOtp ? (
              <Text style={{ color: colors.danger, marginTop: spacing.sm, fontSize: 13, textAlign: rtl ? "right" : "left" }}>
                {t("walletDevOtp", { code: lastWithdrawMeta.devOtp })}
              </Text>
            ) : null}
            <TextInput
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              placeholder="000000"
              placeholderTextColor={colors.textMuted}
              style={{
                marginTop: spacing.md,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.md,
                padding: spacing.md,
                fontSize: 22,
                letterSpacing: 4,
                color: colors.text,
                textAlign: "center",
              }}
            />
          </SectionSurface>
          <FormErrorCallout message={err} />
          <CustomButton title={t("walletConfirmWithdraw")} variant="ink" onPress={onConfirm} loading={busy} disabled={busy} />
          <CustomButton
            style={{ marginTop: spacing.sm }}
            title={t("walletCancelRequest")}
            variant="outline"
            onPress={() => {
              dispatch(clearWithdrawMeta());
              setOtp("");
              setErr(null);
            }}
          />
        </>
      )}
    </WeretListScreen>
  );
}
