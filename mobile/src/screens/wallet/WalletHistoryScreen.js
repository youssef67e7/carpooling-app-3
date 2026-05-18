import { useCallback, useState } from "react";
import { View, Text, FlatList, RefreshControl, I18nManager } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { useTheme } from "../../context/ThemeProvider";
import SectionSurface from "../../components/ui/SectionSurface";
import { fetchWalletTransactions } from "../../store/slices/walletSlice";

export default function WalletHistoryScreen() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { colors, spacing } = useTheme();
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
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: spacing.md }}>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <Text style={{ color: colors.textMuted, textAlign: "center", marginTop: spacing.xl }}>{t("walletNoTx")}</Text>
        }
        renderItem={({ item }) => (
          <SectionSurface style={{ marginBottom: spacing.sm }} noEntering>
            <View style={{ flexDirection: rtl ? "row-reverse" : "row", justifyContent: "space-between" }}>
              <Text style={{ color: colors.text, fontWeight: "700" }}>{t(`walletTxType_${item.type}`)}</Text>
              <Text
                style={{
                  color: item.type === "withdraw" || item.type === "ride_charge" ? colors.danger : colors.success,
                  fontWeight: "800",
                }}
              >
                {item.type === "withdraw" || item.type === "ride_charge" ? "−" : "+"}
                {Number(item.amount || 0).toFixed(2)}
              </Text>
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4, textAlign: rtl ? "right" : "left" }}>
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
    </View>
  );
}
