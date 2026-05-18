import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
  I18nManager,
  Pressable,
  Platform,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { fetchAdminReports, updateAdminReportThunk } from "../store/slices/rideSlice";
import { useTheme } from "../context/ThemeProvider";
import EmptyState from "../components/EmptyState";
import SectionSurface from "../components/ui/SectionSurface";

export default function AdminReportsScreen({ navigation }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { adminReports } = useSelector((s) => s.ride);
  const { colors, spacing } = useTheme();
  const rtl = I18nManager.isRTL;
  const [refreshing, setRefreshing] = useState(false);
  const [initial, setInitial] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({ title: t("adminReportsTitle") });
  }, [navigation, t]);

  const load = useCallback(async () => {
    await dispatch(fetchAdminReports());
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

  function actOnReport(r) {
    const reporter = r.reporterId?.name || "—";
    const reported = r.reportedUserId?.name || "—";
    const patch = (status) => dispatch(updateAdminReportThunk({ id: r._id, status })).then(() => load());
    const more = () =>
      Alert.alert(t("adminReportSetStatus"), "", [
        {
          text: t("reportStatus_resolved"),
          onPress: () => patch("resolved"),
        },
        {
          text: t("reportStatus_dismissed"),
          onPress: () => patch("dismissed"),
        },
        { text: t("cancel"), style: "cancel" },
      ]);
    const first = [
      { text: t("reportStatus_open"), onPress: () => patch("open") },
      { text: t("reportStatus_reviewing"), onPress: () => patch("reviewing") },
      { text: t("adminReportMore"), onPress: more },
    ];
    if (Platform.OS === "ios") first.push({ text: t("cancel"), style: "cancel" });
    Alert.alert(`${reporter} → ${reported}`, r.description?.slice(0, 280) || "", first);
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
        data={adminReports}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<EmptyState title={t("adminReportsEmpty")} subtitle={t("pullToRefresh")} />}
        renderItem={({ item }) => (
          <Pressable onPress={() => actOnReport(item)} accessibilityRole="button">
            <SectionSurface style={{ marginBottom: spacing.sm }} noEntering>
              <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: rtl ? "right" : "left" }}>
                {t(`reportStatus_${item.status}`)}
              </Text>
              <Text style={{ color: colors.text, fontWeight: "800", marginTop: 4, textAlign: rtl ? "right" : "left" }}>
                {item.reason}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 6, textAlign: rtl ? "right" : "left" }}>
                {item.reporterId?.name} → {item.reportedUserId?.name}
              </Text>
              {item.description ? (
                <Text
                  numberOfLines={3}
                  style={{ color: colors.text, fontSize: 14, marginTop: 8, textAlign: rtl ? "right" : "left" }}
                >
                  {item.description}
                </Text>
              ) : null}
            </SectionSurface>
          </Pressable>
        )}
      />
    </View>
  );
}
