import { useCallback, useState } from "react";
import { View, Text, FlatList, RefreshControl, I18nManager } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { useWeretScreenChrome } from "../../hooks/useWeretScreenChrome";
import SectionSurface from "../../components/ui/SectionSurface";
import WeretListScreen from "../../components/ui/weret/WeretListScreen";
import WeretStepHeader from "../../components/ui/weret/WeretStepHeader";
import { fetchWalletTransactions } from "../../store/slices/walletSlice";

export default function WalletHistoryScreen() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { colors, spacing } = useWeretScreenChrome();
  const rtl = I18nManager.isRTL;
  const { transactions } = useSelector((s) => s.wallet);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    await dispatch(fetchWalletTransactions());
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <WeretListScreen scroll={false} contentContainerStyle={{ flex: 1, padding: spacing.md }}>
      <WeretStepHeader title={t("walletHistory")} colors={colors} spacing={spacing} />
      <FlatList
        data={transactions}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <Text style={{ color: colors.textMuted, textAlign: "center", marginTop: spacing.xl }}>{t("walletNoTx")}</Text>
        }
        renderItem={({ item }) => (
          <SectionSurface elevated style={{ marginBottom: spacing.sm }} noEntering>
            <View style={{ flexDirection: rtl ? "row-reverse" : "row", justifyContent: "space-between" }}>
              <Text style={{ color: colors.text, fontWeight: "800" }}>{t(`walletTxType_${item.type}`)}</Text>
              <Text
                style={{
                  color: item.type === "withdraw" || item.type === "ride_charge" ? colors.danger : colors.success,
                  fontWeight: "900",
                }}
              >
                {item.type === "withdraw" || item.type === "ride_charge" ? "−" : "+"}
                {Number(item.amount || 0).toFixed(2)}
              </Text>
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 6, textAlign: rtl ? "right" : "left" }}>
              {item.status} · {new Date(item.createdAt).toLocaleString()}
            </Text>
            {item.note ? (
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4, textAlign: rtl ? "right" : "left" }}>
                {item.note}
              </Text>
            ) : null}
          </SectionSurface>
        )}
      />
    </WeretListScreen>
  );
}
