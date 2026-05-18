import { useCallback, useState } from "react";
import { View, Text, FlatList, RefreshControl, I18nManager } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeProvider";
import { cardShadow } from "../../theme/tokens";
import SectionSurface from "../../components/ui/SectionSurface";
import CustomButton from "../../components/CustomButton";
import PressableScale from "../../components/ui/PressableScale";
import { fetchWalletAccounts } from "../../store/slices/walletSlice";
export default function WalletOverviewScreen({ navigation }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { colors, spacing, radius, isDark } = useTheme();
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

  const shadow = cardShadow(isDark);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: spacing.md }}>
      <SectionSurface style={[shadow, { marginBottom: spacing.md }]} noEntering>
        <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: rtl ? "right" : "left" }}>{t("walletTotalBalance")}</Text>
        <Text style={{ color: colors.text, fontSize: 32, fontWeight: "800", marginTop: 4, textAlign: rtl ? "right" : "left" }}>
          {Number(totalBalance || 0).toFixed(2)}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: spacing.sm, textAlign: rtl ? "right" : "left" }}>
          {t("walletSimulatedDisclaimer")}
        </Text>
        <View style={{ flexDirection: rtl ? "row-reverse" : "row", marginTop: spacing.md }}>
          <View style={{ flex: 1, marginEnd: spacing.xs }}>
            <CustomButton title={t("walletAddMoney")} variant="lime" onPress={() => navigation.navigate("WalletDeposit")} />
          </View>
          <View style={{ flex: 1, marginStart: spacing.xs }}>
            <CustomButton title={t("walletWithdraw")} variant="outline" onPress={() => navigation.navigate("WalletWithdraw")} />
          </View>
        </View>
        <CustomButton
          style={{ marginTop: spacing.sm }}
          title={t("walletHistory")}
          variant="outline"
          onPress={() => navigation.navigate("WalletHistory")}
        />
      </SectionSurface>

      <View style={{ flexDirection: rtl ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm }}>
        <Text style={{ color: colors.text, fontWeight: "700", fontSize: 16 }}>{t("walletYourMethods")}</Text>
        <PressableScale onPress={() => navigation.navigate("WalletAddAccount")} accessibilityRole="button">
          <Text style={{ color: colors.primary, fontWeight: "700" }}>{t("walletAddMethod")}</Text>
        </PressableScale>
      </View>

      {error ? (
        <Text style={{ color: colors.danger, marginBottom: spacing.sm }}>{error}</Text>
      ) : null}

      <FlatList
        data={accounts}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <Text style={{ color: colors.textMuted, textAlign: "center", marginTop: spacing.lg }}>{t("walletNoMethods")}</Text>
        }
        renderItem={({ item }) => (
          <SectionSurface style={{ marginBottom: spacing.sm }} noEntering>
            <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: spacing.sm }}>
              <MaterialCommunityIcons name="wallet-outline" size={24} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: "700", textAlign: rtl ? "right" : "left" }}>
                  {t(`walletType_${item.walletType}`)}
                </Text>
                {item.phoneNumber ? (
                  <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: rtl ? "right" : "left" }}>{item.phoneNumber}</Text>
                ) : null}
                <Text style={{ color: colors.primary, fontWeight: "800", marginTop: 4, textAlign: rtl ? "right" : "left" }}>
                  {Number(item.balance || 0).toFixed(2)}
                </Text>
              </View>
            </View>
          </SectionSurface>
        )}
      />
    </View>
  );
}
