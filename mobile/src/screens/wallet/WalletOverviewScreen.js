import { useCallback, useState } from "react";
import { View, Text, FlatList, RefreshControl, I18nManager } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useWeretScreenChrome } from "../../hooks/useWeretScreenChrome";
import { weretElevation } from "../../theme/weretDesignSystem";
import SectionSurface from "../../components/ui/SectionSurface";
import CustomButton from "../../components/CustomButton";
import PressableScale from "../../components/ui/PressableScale";
import WeretListScreen from "../../components/ui/weret/WeretListScreen";
import { fetchWalletAccounts } from "../../store/slices/walletSlice";

export default function WalletOverviewScreen({ navigation }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { colors, spacing } = useWeretScreenChrome();
  const rtl = I18nManager.isRTL;
  const { accounts, totalBalance, error } = useSelector((s) => s.wallet);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    await dispatch(fetchWalletAccounts());
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
      <SectionSurface elevated noEntering style={{ marginBottom: spacing.md }}>
        <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: "700", letterSpacing: 0.5, textAlign: rtl ? "right" : "left" }}>
          {t("walletTotalBalance")}
        </Text>
        <Text style={{ color: colors.text, fontSize: 34, fontWeight: "900", marginTop: 6, textAlign: rtl ? "right" : "left", letterSpacing: -1 }}>
          {Number(totalBalance || 0).toFixed(2)}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: spacing.sm, textAlign: rtl ? "right" : "left" }}>
          {t("walletSimulatedDisclaimer")}
        </Text>
        <View style={{ flexDirection: rtl ? "row-reverse" : "row", marginTop: spacing.md, gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <CustomButton title={t("walletAddMoney")} variant="ink" onPress={() => navigation.navigate("WalletDeposit")} />
          </View>
          <View style={{ flex: 1 }}>
            <CustomButton title={t("walletWithdraw")} variant="outline" onPress={() => navigation.navigate("WalletWithdraw")} />
          </View>
        </View>
      </SectionSurface>

      {error ? (
        <Text style={{ color: colors.danger, marginBottom: spacing.sm, textAlign: rtl ? "right" : "left" }}>{error}</Text>
      ) : null}

      <PressableScale onPress={() => navigation.navigate("WalletAddAccount")} style={{ marginBottom: spacing.md }}>
        <Text style={{ color: colors.text, fontWeight: "800", textAlign: rtl ? "right" : "left" }}>{t("walletAddMethod")}</Text>
      </PressableScale>

      <FlatList
        data={accounts}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={{ color: colors.textMuted, textAlign: "center" }}>{t("walletNoMethods")}</Text>}
        renderItem={({ item }) => (
          <PressableScale
            onPress={() => navigation.navigate("WalletHistory", { accountId: item._id })}
            style={{
              marginBottom: spacing.sm,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 18,
              padding: spacing.md,
              backgroundColor: colors.surface,
              flexDirection: rtl ? "row-reverse" : "row",
              alignItems: "center",
              ...weretElevation.card,
            }}
          >
            <MaterialCommunityIcons name="wallet-outline" size={24} color={colors.text} />
            <View style={{ flex: 1, marginHorizontal: spacing.md }}>
              <Text style={{ color: colors.text, fontWeight: "800", textAlign: rtl ? "right" : "left" }}>
                {item.label || t(`walletType_${item.walletType}`, { defaultValue: item.walletType })}
              </Text>
              <Text style={{ color: colors.text, fontWeight: "900", marginTop: 4, textAlign: rtl ? "right" : "left" }}>
                {Number(item.balance || 0).toFixed(2)}
              </Text>
            </View>
            <MaterialCommunityIcons name={rtl ? "chevron-left" : "chevron-right"} size={22} color={colors.textMuted} />
          </PressableScale>
        )}
      />
    </WeretListScreen>
  );
}
