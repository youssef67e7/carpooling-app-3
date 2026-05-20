import { useEffect, useState, useCallback, useLayoutEffect } from "react";
import { FlatList, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { fetchHistory } from "../store/slices/rideSlice";
import { useWeretScreenChrome } from "../hooks/useWeretScreenChrome";
import WeretAmbientBackground from "../components/ui/weret/WeretAmbientBackground";
import RideCard from "../components/RideCard";
import EmptyState from "../components/EmptyState";

export default function PassengerHistoryScreen({ navigation }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { history } = useSelector((s) => s.ride);
  const { colors, spacing } = useWeretScreenChrome();
  const [refreshing, setRefreshing] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: t("history") });
  }, [navigation, t]);

  const load = useCallback(async () => {
    await dispatch(fetchHistory());
  }, [dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <WeretAmbientBackground>
      <FlatList
        style={{ flex: 1 }}
        data={history}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl * 2, flexGrow: 1 }}
        refreshing={refreshing}
        onRefresh={onRefresh}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyState title={t("noRides")} subtitle={t("pullToRefresh")} icon="history" />}
        renderItem={({ item }) => (
          <View style={{ marginBottom: spacing.sm }}>
            <RideCard ride={item} />
          </View>
        )}
      />
    </WeretAmbientBackground>
  );
}
