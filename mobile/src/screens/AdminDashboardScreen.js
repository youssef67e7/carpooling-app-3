import { useEffect, useLayoutEffect, useMemo } from "react";
import { View, Text, ScrollView, Pressable, I18nManager, ActivityIndicator } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { logoutThunk } from "../store/slices/authSlice";
import { fetchAdminStats } from "../store/slices/rideSlice";
import { useTheme } from "../context/ThemeProvider";
import CustomButton from "../components/CustomButton";
import AdminPulsingShield from "../components/admin/AdminPulsingShield";
import StaggerEntrance from "../components/ui/StaggerEntrance";
import { D } from "../animation/presets";

function StatCard({ label, value, colors, spacing, radius }) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: radius.md,
        padding: spacing.md,
        borderWidth: 1,
      }}
    >
      <Text style={{ color: colors.textMuted, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 28, fontWeight: "800", marginTop: spacing.xs }}>{value}</Text>
    </View>
  );
}

export default function AdminDashboardScreen({ navigation }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { adminStats } = useSelector((s) => s.ride);
  const { colors, spacing, radius } = useTheme();
  const rtl = I18nManager.isRTL;

  const statItems = useMemo(() => {
    if (!adminStats) return [];
    return [
      { label: t("totalUsers"), value: adminStats.totalUsers },
      { label: t("totalRides"), value: adminStats.totalRides },
      { label: t("driversOnline"), value: adminStats.driversOnline },
      { label: t("activeRides"), value: adminStats.activeRides ?? 0 },
    ];
  }, [adminStats, t]);

  useEffect(() => {
    dispatch(fetchAdminStats());
  }, [dispatch]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t("admin"),
      headerRight: () => (
        <View style={{ flexDirection: rtl ? "row-reverse" : "row", gap: 12, alignItems: "center" }}>
          <Pressable onPress={() => navigation.navigate("Users")}>
            <Text style={{ color: colors.primary, fontWeight: "600" }}>{t("adminUsers")}</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate("Rides")}>
            <Text style={{ color: colors.primary, fontWeight: "600" }}>{t("adminRides")}</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate("Settings")}>
            <Text style={{ color: colors.primary, fontWeight: "600" }}>{t("settings")}</Text>
          </Pressable>
          <Pressable onPress={() => dispatch(logoutThunk())}>
            <Text style={{ color: colors.textMuted }}>{t("logout")}</Text>
          </Pressable>
        </View>
      ),
    });
  }, [navigation, dispatch, t, rtl, colors]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
      <Animated.View
        entering={FadeInUp.duration(D.normal)}
        style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: spacing.sm }}
      >
        <AdminPulsingShield color={colors.primary} size={30} />
        <Text
          style={{
            color: colors.text,
            fontSize: 22,
            fontWeight: "800",
            textAlign: rtl ? "right" : "left",
            flex: 1,
          }}
        >
          {t("adminDashboardTitle")}
        </Text>
      </Animated.View>
      {!adminStats ? (
        <ActivityIndicator style={{ marginTop: spacing.lg }} color={colors.primary} />
      ) : (
        <View style={{ gap: spacing.md }}>
          {statItems.map((s, i) => (
            <StaggerEntrance key={s.label} index={i}>
              <StatCard label={s.label} value={s.value} colors={colors} spacing={spacing} radius={radius} />
            </StaggerEntrance>
          ))}
        </View>
      )}
      <CustomButton title={t("viewAllUsers")} onPress={() => navigation.navigate("Users")} style={{ marginTop: spacing.sm }} />
      <CustomButton title={t("viewAllRides")} variant="outline" onPress={() => navigation.navigate("Rides")} />
    </ScrollView>
  );
}
