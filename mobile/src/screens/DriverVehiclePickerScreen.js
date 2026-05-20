import { useState, useMemo, useLayoutEffect } from "react";
import { View, FlatList, StyleSheet, I18nManager, ActivityIndicator } from "react-native";
import { showAlert } from "../utils/showAlert";
import { useRoute } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { DRIVER_VEHICLE_TYPES, DRIVER_VEHICLE_CAR_TYPES } from "../constants/vehicleTypes";
import { getServiceIconName } from "../utils/serviceTypeIcons";
import { updateProfileThunk, clearError } from "../store/slices/authSlice";
import { useWeretScreenChrome } from "../hooks/useWeretScreenChrome";
import WeretAmbientBackground from "../components/ui/weret/WeretAmbientBackground";
import WeretStepHeader from "../components/ui/weret/WeretStepHeader";
import WeretOptionCard from "../components/ui/weret/WeretOptionCard";

export default function DriverVehiclePickerScreen({ navigation }) {
  const { t } = useTranslation();
  const route = useRoute();
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { colors, spacing } = useWeretScreenChrome();
  const [saving, setSaving] = useState(false);

  const vehicleList = useMemo(() => {
    const f = route.params?.filter;
    if (f === "car") return DRIVER_VEHICLE_CAR_TYPES;
    return DRIVER_VEHICLE_TYPES;
  }, [route.params?.filter]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title:
        route.params?.filter === "car" ? t("driverPickVehicleCarListTitle") : t("driverChooseVehicleHeader"),
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.text,
      headerShadowVisible: false,
    });
  }, [navigation, route.params?.filter, t, colors]);

  async function pick(vt) {
    dispatch(clearError());
    setSaving(true);
    try {
      await dispatch(updateProfileThunk({ vehicleType: vt })).unwrap();
      showAlert(t("success"), t("vehicleClassSaved"), [{ text: t("back"), onPress: () => navigation.goBack() }]);
    } catch (e) {
      showAlert(t("error"), String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <WeretAmbientBackground>
      <View style={styles.root}>
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
          <WeretStepHeader
            title={t("driverChooseVehicleTitle")}
            subtitle={t("driverChooseVehicleSubtitle")}
            colors={colors}
            spacing={spacing}
          />
        </View>
        {saving ? (
          <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.text} />
        ) : (
          <FlatList
            data={vehicleList}
            keyExtractor={(k) => k}
            contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl * 2 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item: vt }) => {
              const active = (user?.vehicleType || "delivery") === vt;
              return (
                <WeretOptionCard
                  title={t(`vehicleType_${vt}`)}
                  iconName={getServiceIconName(vt)}
                  onPress={() => pick(vt)}
                  colors={colors}
                  selected={active}
                />
              );
            }}
          />
        )}
      </View>
    </WeretAmbientBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
