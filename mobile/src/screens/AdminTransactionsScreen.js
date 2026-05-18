import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, Alert, RefreshControl, I18nManager, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { fetchAdminTransactions, flagAdminTransactionThunk } from "../store/slices/rideSlice";
import { useTheme } from "../context/ThemeProvider";
import EmptyState from "../components/EmptyState";
import SectionSurface from "../components/ui/SectionSurface";

export default function AdminTransactionsScreen({ navigation }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { adminTransactions } = useSelector((s) => s.ride);
  const { colors, spacing } = useTheme();
  const rtl = I18nManager.isRTL;
  const [refreshing, setRefreshing] = useState(false);
  const [initial, setInitial] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({ title: t("adminTransactionsTitle") });
  }, [navigation, t]);

  const load = useCallback(async () => {
    await dispatch(fetchAdminTransactions());
  }, [dispatch]);

  useEffect(() => {
    (async () => {
      await load();
      setInitial(false);
    })();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  function actOnTx(tx) {
    Alert.alert(t("adminTxActions"), `${tx.userId?.name ?? "—"} · ${t(`walletTxType_${tx.type}`)} · ${Number(tx.amount || 0).toFixed(2)}`, [
      {
        text: t("adminTxFlag"),
        onPress: () =>
          dispatch(
            flagAdminTransactionThunk({
              id: tx._id,
              flagged: true,
              flaggedReason: t("adminTxFlagDefault"),
            })
          ).then(() => load()),
      },
      {
        text: t("adminTxUnflag"),
        onPress: () => dispatch(flagAdminTransactionThunk({ id: tx._id, flagged: false })).then(() => load()),
      },
      { text: t("cancel"), style: "cancel" },
    ]);
  }

  if (initial) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={adminTransactions}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<EmptyState title={t("adminTransactionsEmpty")} subtitle={t("pullToRefresh")} />}
        renderItem={({ item }) => (
          <Pressable onPress={() => actOnTx(item)} accessibilityRole="button">
            <SectionSurface style={{ marginBottom: spacing.sm }} noEntering>
              <View style={{ flexDirection: rtl ? "row-reverse" : "row", justifyContent: "space-between" }}>
                <Text style={{ color: colors.text, fontWeight: "800" }}>{t(`walletTxType_${item.type}`)}</Text>
                <Text style={{ color: colors.text, fontWeight: "800" }}>{Number(item.amount || 0).toFixed(2)}</Text>
              </View>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 6, textAlign: rtl ? "right" : "left" }}>
                {item.userId?.name} · {item.status}
                {item.flagged ? ` · ${t("adminTxFlagged")}` : ""}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4, textAlign: rtl ? "right" : "left" }}>
                {new Date(item.createdAt).toLocaleString()}
              </Text>
              {item.flaggedReason ? (
                <Text style={{ color: colors.danger, fontSize: 12, marginTop: 6, textAlign: rtl ? "right" : "left" }}>
                  {item.flaggedReason}
                </Text>
              ) : null}
            </SectionSurface>
          </Pressable>
        )}
      />
    </View>
  );
}
