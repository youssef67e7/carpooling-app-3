import { useEffect, useState, useCallback, useLayoutEffect } from "react";
import { View, FlatList, Pressable, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { fetchHistory } from "../store/slices/rideSlice";
import { useTheme } from "../context/ThemeProvider";
import RideCard from "../components/RideCard";
import EmptyState from "../components/EmptyState";

export default function PassengerHistoryScreen({ navigation }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { history } = useSelector((s) => s.ride);
  const { colors, spacing } = useTheme();
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
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={history}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl, flexGrow: 1 }}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={<EmptyState title={t("noRides")} subtitle={t("pullToRefresh")} />}
        renderItem={({ item }) => (
          <View style={{ marginBottom: spacing.sm }}>
            <RideCard ride={item} />
          </View>
        )}
      />
      <Pressable style={{ padding: spacing.md, alignItems: "center" }} onPress={() => navigation.goBack()}>
        <Text style={{ color: colors.primary, fontWeight: "700" }}>{t("back")}</Text>
      </Pressable>
    </View>
  );
}
