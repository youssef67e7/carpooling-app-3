import { useState, useMemo, useLayoutEffect } from "react";
import { View, Text, Pressable, FlatList, StyleSheet, I18nManager, ActivityIndicator } from "react-native";
import { showAlert } from "../utils/showAlert";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { DRIVER_VEHICLE_TYPES, DRIVER_VEHICLE_CAR_TYPES } from "../constants/vehicleTypes";
import { getServiceIconName } from "../utils/serviceTypeIcons";
import { updateProfileThunk, clearError } from "../store/slices/authSlice";
import { useWeretScreenChrome } from "../hooks/useWeretScreenChrome";

export default function DriverVehiclePickerScreen({ navigation }) {
  const { t } = useTranslation();
  const route = useRoute();
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { colors, spacing } = useWeretScreenChrome();
  const rtl = I18nManager.isRTL;
  const [saving, setSaving] = useState(false);

  const vehicleList = useMemo(() => {
    const f = route.params?.filter;
    if (f === "car") return DRIVER_VEHICLE_CAR_TYPES;
    return DRIVER_VEHICLE_TYPES;
  }, [route.params?.filter]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title:
        route.params?.filter === "car"
          ? t("driverPickVehicleCarListTitle")
          : t("driverChooseVehicleHeader"),
    });
  }, [navigation, route.params?.filter, t]);

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
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.text, textAlign: rtl ? "right" : "left", paddingHorizontal: spacing.md }]}>
        {t("driverChooseVehicleTitle")}
      </Text>
      <Text style={[styles.sub, { color: colors.textMuted, textAlign: rtl ? "right" : "left", paddingHorizontal: spacing.md }]}>
        {t("driverChooseVehicleSubtitle")}
      </Text>
      {saving ? (
        <ActivityIndicator style={{ marginTop: spacing.lg }} color={colors.primary} />
      ) : (
        <FlatList
          data={vehicleList}
          keyExtractor={(k) => k}
          contentContainerStyle={{ padding: spacing.md }}
          renderItem={({ item: vt }) => {
            const icon = getServiceIconName(vt);
            const active = (user?.vehicleType || "delivery") === vt;
            return (
              <Pressable
                onPress={() => pick(vt)}
                style={({ pressed }) => [
                  styles.row,
                  {
                    flexDirection: rtl ? "row-reverse" : "row",
                    backgroundColor: active ? colors.surfaceMuted : colors.surface,
                    borderColor: active ? colors.primary : colors.border,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <View style={[styles.iconBox, { backgroundColor: colors.surfaceMuted }]}>
                  <MaterialCommunityIcons name={icon} size={28} color={colors.text} />
                </View>
                <Text style={[styles.label, { color: colors.text, textAlign: rtl ? "right" : "left" }]}>
                  {t(`vehicleType_${vt}`)}
                </Text>
                <MaterialCommunityIcons name={rtl ? "chevron-left" : "chevron-right"} size={22} color={colors.textMuted} />
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingTop: 8 },
  title: { fontSize: 22, fontWeight: "800", marginTop: 8 },
  sub: { fontSize: 14, marginTop: 8, marginBottom: 8 },
  row: {
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    gap: 14,
  },
  iconBox: { width: 52, height: 52, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  label: { flex: 1, fontSize: 16, fontWeight: "600" },
});
