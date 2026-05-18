import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, I18nManager } from "react-native";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { useWeretScreenChrome } from "../hooks/useWeretScreenChrome";
import { Ionicons } from "@expo/vector-icons";
import {
  fetchDriverProfileThunk,
  fetchDriverStatusThunk,
  deleteDriverCarThunk,
  setActiveDriverCarThunk,
} from "../store/slices/driverSlice";
import { showAlert } from "../utils/showAlert";
import CustomButton from "../components/CustomButton";

function carTitle(c) {
  const brand = c?.brand || "";
  const model = c?.model || "";
  const plate = c?.plateNumber ? ` · ${c.plateNumber}` : "";
  return `${brand} ${model}`.trim() + plate;
}

export default function DriverCarsScreen({ navigation }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { colors, spacing, radius } = useWeretScreenChrome();
  const rtl = I18nManager.isRTL;

  const { profile, status, loading } = useSelector((s) => s.driver);
  const { user } = useSelector((s) => s.auth);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    dispatch(fetchDriverProfileThunk());
    dispatch(fetchDriverStatusThunk());
  }, [dispatch]);

  const cars = useMemo(() => (Array.isArray(profile?.cars) ? profile.cars : []), [profile?.cars]);
  const selectedId = profile?.selectedCarId ? String(profile.selectedCarId) : null;
  const approved = status?.applicationStatus === "approved" && status?.profileStatus === "approved";

  const setActive = useCallback(
    async (carId) => {
      setBusyId(carId);
      try {
        await dispatch(setActiveDriverCarThunk(carId)).unwrap();
        showAlert(t("success"), t("driverActiveCarSaved"));
      } catch (e) {
        showAlert(t("error"), String(e));
      } finally {
        setBusyId(null);
      }
    },
    [dispatch, t]
  );

  const removeCar = useCallback(
    async (carId) => {
      setBusyId(carId);
      try {
        await dispatch(deleteDriverCarThunk(carId)).unwrap();
        showAlert(t("success"), t("driverCarDeleted"));
      } catch (e) {
        showAlert(t("error"), String(e));
      } finally {
        setBusyId(null);
      }
    },
    [dispatch, t]
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
      <View
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          padding: spacing.md,
          marginBottom: spacing.sm,
        }}
      >
        <Text style={{ color: colors.text, fontWeight: "900", fontSize: 18, textAlign: rtl ? "right" : "left" }}>
          {t("driverMyCarsTitle")}
        </Text>
        <Text style={{ color: colors.textMuted, marginTop: 6, textAlign: rtl ? "right" : "left" }}>
          {approved ? t("driverMyCarsApprovedHint") : t("driverMyCarsPendingHint")}
        </Text>
        {user?.isOnline ? (
          <Text style={{ color: colors.danger, marginTop: 6, fontWeight: "700", textAlign: rtl ? "right" : "left" }}>
            {t("driverCarsOnlineWarning")}
          </Text>
        ) : null}
      </View>

      <CustomButton
        title={t("driverAddCar")}
        onPress={() => navigation.navigate("DriverCarEditor", { mode: "add" })}
        disabled={loading}
      />

      <View style={{ height: spacing.sm }} />

      {cars.length === 0 ? (
        <Text style={{ color: colors.textMuted, textAlign: "center", marginTop: spacing.lg }}>
          {t("driverNoCarsYet")}
        </Text>
      ) : (
        cars.map((c) => {
          const id = String(c._id);
          const active = selectedId && id === selectedId;
          const disabled = !!user?.isOnline;
          return (
            <View
              key={id}
              style={[
                styles.card,
                {
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? colors.surfaceMuted : colors.surface,
                  borderRadius: radius.md,
                },
              ]}
            >
              <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 12 }}>
                <View style={[styles.iconWrap, { backgroundColor: colors.surfaceMuted }]}>
                  <Ionicons name={active ? "car-sport" : "car-outline"} size={22} color={active ? colors.primary : colors.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: "900", textAlign: rtl ? "right" : "left" }}>
                    {carTitle(c)}
                  </Text>
                  <Text style={{ color: colors.textMuted, marginTop: 4, textAlign: rtl ? "right" : "left" }}>
                    {t("seats")}: {c.seats} · {t("driverCarCategory")}: {String(c.carCategory || "sedan")}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: rtl ? "row-reverse" : "row", gap: spacing.sm, marginTop: spacing.sm }}>
                <CustomButton
                  style={{ flex: 1 }}
                  title={t("driverEditCar")}
                  variant="outline"
                  onPress={() => navigation.navigate("DriverCarEditor", { mode: "edit", carId: id })}
                  disabled={loading}
                />
                <CustomButton
                  style={{ flex: 1 }}
                  title={active ? t("driverActiveCar") : t("driverSetActiveCar")}
                  variant={active ? "lime" : "primary"}
                  onPress={() => setActive(id)}
                  disabled={loading || active || disabled}
                  loading={busyId === id}
                />
              </View>

              <View style={{ marginTop: spacing.sm }}>
                <CustomButton
                  title={t("delete")}
                  variant="danger"
                  onPress={() => removeCar(id)}
                  disabled={loading || disabled}
                  loading={busyId === id}
                />
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: 14, marginBottom: 10 },
  iconWrap: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});

