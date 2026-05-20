import { useEffect, useCallback, useMemo, useState } from "react";
import { View, Text, FlatList, RefreshControl, I18nManager } from "react-native";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { useIsFocused } from "@react-navigation/native";
import { fetchHistory } from "../../store/slices/rideSlice";
import { useWeretScreenChrome } from "../../hooks/useWeretScreenChrome";
import { weretRadius, weretElevation } from "../../theme/weretDesignSystem";
import EmptyState from "../../components/EmptyState";
import WeretListScreen from "../../components/ui/weret/WeretListScreen";
import WeretStepHeader from "../../components/ui/weret/WeretStepHeader";

export default function DriverRatingsScreen() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { history } = useSelector((s) => s.ride);
  const { colors, spacing } = useWeretScreenChrome();
  const rtl = I18nManager.isRTL;
  const isFocused = useIsFocused();
  const [refreshing, setRefreshing] = useState(false);

  const completedRated = useMemo(() => {
    const list = history || [];
    return list
      .filter((r) => r.status === "completed")
      .sort((a, b) => new Date(b.completedAt || b.createdAt || 0) - new Date(a.completedAt || a.createdAt || 0));
  }, [history]);

  const load = useCallback(async () => {
    await dispatch(fetchHistory());
  }, [dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (isFocused) load();
  }, [isFocused, load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const renderItem = ({ item }) => {
    const name = item.passengerId?.name || t("passenger");
    const stars = item.passengerRating != null ? Number(item.passengerRating) : null;
    const when = new Date(item.completedAt || item.createdAt).toLocaleString();
    const subId = item._id ? String(item._id).slice(-8) : "";

    return (
      <View
        style={{
          padding: spacing.md,
          marginBottom: spacing.sm,
          borderRadius: weretRadius.card,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          ...weretElevation.card,
        }}
      >
        <View style={{ flexDirection: rtl ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: colors.text, fontWeight: "900", flex: 1, textAlign: rtl ? "right" : "left" }}>{name}</Text>
          {stars != null ? (
            <Text style={{ color: colors.text, fontWeight: "900", fontSize: 16 }}>★ {stars}/5</Text>
          ) : (
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>{t("driverRatingPendingFromPassenger")}</Text>
          )}
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 6, textAlign: rtl ? "right" : "left" }}>
          {when} · #{subId}
        </Text>
        {item.passengerReview ? (
          <Text style={{ color: colors.text, marginTop: spacing.sm, fontSize: 14, fontStyle: "italic", textAlign: rtl ? "right" : "left" }}>
            “{item.passengerReview}”
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <WeretListScreen scroll={false} contentContainerStyle={{ flex: 1, padding: spacing.md }}>
      <WeretStepHeader title={t("driverRatingsTitle")} subtitle={t("driverRatingsPerTripIntro")} colors={colors} spacing={spacing} />
      <FlatList
        data={completedRated}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xl, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<EmptyState title={t("driverRatingsNoTrips")} subtitle={t("pullToRefresh")} />}
      />
    </WeretListScreen>
  );
}
