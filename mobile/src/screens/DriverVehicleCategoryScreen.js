import React, { useLayoutEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  I18nManager,
} from "react-native";
import { showAlert } from "../utils/showAlert";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch } from "react-redux";
import { updateProfileThunk } from "../store/slices/authSlice";
import { getServiceIconName } from "../utils/serviceTypeIcons";
import { useWeretScreenChrome } from "../hooks/useWeretScreenChrome";
import PressableScale from "../components/ui/PressableScale";

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  closeText: { fontSize: 16, fontWeight: "800" },
  title: {
    fontSize: 22,
    fontWeight: "900",
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 20,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  label: { flex: 1, fontSize: 16, fontWeight: "900" },
  metaRow: { marginTop: 6, flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  dot: { width: 10, height: 10, borderRadius: 999, borderWidth: 1 },
});

export default function DriverVehicleCategoryScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { colors, spacing, radius } = useWeretScreenChrome();
  const rtl = I18nManager.isRTL;

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const onCar = () => {
    navigation.navigate("DriverVehicleList", { filter: "car" });
  };

  const onMotorcycle = async () => {
    try {
      await dispatch(updateProfileThunk({ vehicleType: "motorcycle" })).unwrap();
      showAlert(t("success"), t("vehicleClassSaved"));
      navigation.goBack();
    } catch (e) {
      showAlert(t("error"), e?.message || String(e));
    }
  };

  const carMeta = {
    title: t("driverVehicleByCar"),
    subtitle: t("driverPickVehicleCarListTitle"),
    color: colors.primary,
    seats: 4,
    iconKey: "car_standard",
    onPress: onCar,
  };
  const bikeMeta = {
    title: t("driverVehicleByBike"),
    subtitle: t("vehicleType_motorcycle"),
    color: colors.accent || colors.primary,
    seats: 1,
    iconKey: "motorcycle",
    onPress: onMotorcycle,
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      <View style={[styles.topBar, { paddingHorizontal: spacing.md }]}>
        <PressableScale onPress={() => navigation.goBack()} hitSlop={12} accessibilityRole="button">
          <Text style={[styles.closeText, { color: colors.primary }]}>{t("driverClose")}</Text>
        </PressableScale>
        <PressableScale onPress={() => navigation.goBack()} hitSlop={12} accessibilityRole="button">
          <Ionicons name={rtl ? "chevron-forward" : "chevron-back"} size={26} color={colors.text} />
        </PressableScale>
      </View>
      <Text style={[styles.title, { color: colors.text, textAlign: rtl ? "right" : "left" }]}>{t("driverPickVehicleTitle")}</Text>

      {[carMeta, bikeMeta].map((m) => (
        <PressableScale
          key={m.iconKey}
          onPress={m.onPress}
          accessibilityRole="button"
          style={[
            styles.card,
            {
              flexDirection: rtl ? "row-reverse" : "row",
              borderColor: colors.border,
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.md,
            },
          ]}
        >
          <View style={[styles.iconWrap, { backgroundColor: colors.surfaceMuted }]}>
            <MaterialCommunityIcons name={getServiceIconName(m.iconKey)} size={32} color={colors.text} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.text, textAlign: rtl ? "right" : "left" }]} numberOfLines={1}>
              {m.title}
            </Text>
            <Text style={{ color: colors.textMuted, marginTop: 4, textAlign: rtl ? "right" : "left" }} numberOfLines={2}>
              {m.subtitle}
            </Text>
            <View style={[styles.metaRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
              <View style={[styles.dot, { backgroundColor: m.color, borderColor: colors.border }]} />
              <Text style={{ color: colors.textMuted, fontWeight: "700" }}>{t("seats")}: {m.seats}</Text>
            </View>
          </View>
          <Ionicons name={rtl ? "chevron-back" : "chevron-forward"} size={20} color={colors.textMuted} />
        </PressableScale>
      ))}
    </View>
  );
}
