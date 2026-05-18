import { useEffect, useState, useCallback, useLayoutEffect } from "react";
import { View, FlatList, Text, ActivityIndicator, I18nManager } from "react-native";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { fetchAdminRides } from "../store/slices/rideSlice";
import { useTheme } from "../context/ThemeProvider";
import RideCard from "../components/RideCard";
import EmptyState from "../components/EmptyState";

export default function AdminRidesScreen({ navigation }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { adminRides } = useSelector((s) => s.ride);
  const { colors, spacing } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [initial, setInitial] = useState(true);
  const rtl = I18nManager.isRTL;

  useLayoutEffect(() => {
    navigation.setOptions({ title: t("adminRides") });
  }, [navigation, t]);

  const load = useCallback(async () => {
    await dispatch(fetchAdminRides());
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
        data={adminRides}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl, flexGrow: 1 }}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={<EmptyState title={t("noRidesAdmin")} subtitle={t("pullToRefresh")} />}
        renderItem={({ item }) => (
          <View style={{ marginBottom: spacing.md }}>
            <RideCard ride={item} />
            <Text style={{ color: colors.textMuted, marginTop: spacing.xs, fontSize: 13, textAlign: rtl ? "right" : "left" }}>
              {t("passenger")}: {item.passengerId?.email || "—"}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: rtl ? "right" : "left" }}>
              {t("driver")}: {item.driverId?.email || "—"}
            </Text>
          </View>
        )}
      />
    </View>
  );
}
