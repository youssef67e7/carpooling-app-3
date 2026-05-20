import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, I18nManager } from "react-native";
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
import WeretListScreen from "../components/ui/weret/WeretListScreen";
import WeretStepHeader from "../components/ui/weret/WeretStepHeader";
import SectionSurface from "../components/ui/SectionSurface";
import { weretElevation, weretRadius } from "../theme/weretDesignSystem";

function carTitle(c) {
  const brand = c?.brand || "";
  const model = c?.model || "";
  const plate = c?.plateNumber ? ` · ${c.plateNumber}` : "";
  return `${brand} ${model}`.trim() + plate;
}

export default function DriverCarsScreen({ navigation }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { colors, spacing } = useWeretScreenChrome();
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
    <WeretListScreen contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl * 2 }}>
      <WeretStepHeader
        title={t("driverMyCarsTitle")}
        subtitle={approved ? t("driverMyCarsApprovedHint") : t("driverMyCarsPendingHint")}
        colors={colors}
        spacing={spacing}
      />

      {user?.isOnline ? (
        <SectionSurface noEntering style={{ marginBottom: spacing.sm, borderColor: colors.danger }}>
          <Text style={{ color: colors.danger, fontWeight: "800", textAlign: rtl ? "right" : "left" }}>{t("driverCarsOnlineWarning")}</Text>
        </SectionSurface>
      ) : null}

      <CustomButton title={t("driverAddCar")} variant="ink" onPress={() => navigation.navigate("DriverCarEditor", { mode: "add" })} disabled={loading} />

      <View style={{ height: spacing.md }} />

      {cars.length === 0 ? (
        <SectionSurface elevated noEntering>
          <Text style={{ color: colors.textMuted, textAlign: "center", fontWeight: "600" }}>{t("driverNoCarsYet")}</Text>
        </SectionSurface>
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
                  borderColor: active ? colors.text : colors.border,
                  backgroundColor: colors.surface,
                  borderWidth: active ? 2 : 1,
                  ...(active ? weretElevation.heroFloat : weretElevation.card),
                },
              ]}
            >
              <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 12 }}>
                <View style={[styles.iconWrap, { backgroundColor: colors.text }]}>
                  <Ionicons name={active ? "car-sport" : "car-outline"} size={22} color={colors.primaryText} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: "900", textAlign: rtl ? "right" : "left" }}>{carTitle(c)}</Text>
                  <Text style={{ color: colors.textMuted, marginTop: 4, textAlign: rtl ? "right" : "left", fontSize: 13 }}>
                    {t("seats")}: {c.seats} · {t("driverCarCategory")}: {String(c.carCategory || "sedan")}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: rtl ? "row-reverse" : "row", gap: spacing.sm, marginTop: spacing.md }}>
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
                  variant={active ? "ink" : "outline"}
                  onPress={() => setActive(id)}
                  disabled={loading || active || disabled}
                  loading={busyId === id}
                />
              </View>

              <View style={{ marginTop: spacing.sm }}>
                <CustomButton title={t("delete")} variant="danger" onPress={() => removeCar(id)} disabled={loading || disabled} loading={busyId === id} />
              </View>
            </View>
          );
        })
      )}
    </WeretListScreen>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: weretRadius.card, padding: 16, marginBottom: 12 },
  iconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});
