import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, RefreshControl, I18nManager } from "react-native";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { fetchAdminAuditLogs } from "../store/slices/rideSlice";
import { useTheme } from "../context/ThemeProvider";
import EmptyState from "../components/EmptyState";
import SectionSurface from "../components/ui/SectionSurface";

function fmtAction(a) {
  if (!a) return "—";
  return String(a).replace(/\./g, " · ");
}

export default function AdminAuditLogScreen({ navigation }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { adminAuditLogs } = useSelector((s) => s.ride);
  const { colors, spacing } = useTheme();
  const rtl = I18nManager.isRTL;
  const [refreshing, setRefreshing] = useState(false);
  const [initial, setInitial] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({ title: t("adminAuditTitle") });
  }, [navigation, t]);

  const load = useCallback(async () => {
    await dispatch(fetchAdminAuditLogs());
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
        data={adminAuditLogs}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<EmptyState title={t("adminAuditEmpty")} subtitle={t("pullToRefresh")} />}
        renderItem={({ item }) => (
          <SectionSurface style={{ marginBottom: spacing.sm }} noEntering>
            <Text style={{ color: colors.text, fontWeight: "900", textAlign: rtl ? "right" : "left" }}>
              {fmtAction(item.action)}
            </Text>
            <Text style={{ color: colors.textMuted, marginTop: 6, fontSize: 12, textAlign: rtl ? "right" : "left" }}>
              {t("adminAuditActor")}: {item.actorAdminId?.email || "—"}
            </Text>
            <Text style={{ color: colors.textMuted, marginTop: 4, fontSize: 12, textAlign: rtl ? "right" : "left" }}>
              {t("adminAuditTarget")}: {item.targetType} · {String(item.targetId || "").slice(-8)}
            </Text>
            {item.summary ? (
              <Text style={{ color: colors.text, marginTop: 8, fontSize: 13, textAlign: rtl ? "right" : "left" }}>
                {item.summary}
              </Text>
            ) : null}
            <Text style={{ color: colors.textMuted, marginTop: 8, fontSize: 12, textAlign: rtl ? "right" : "left" }}>
              {new Date(item.createdAt).toLocaleString()}
            </Text>
          </SectionSurface>
        )}
      />
    </View>
  );
}

