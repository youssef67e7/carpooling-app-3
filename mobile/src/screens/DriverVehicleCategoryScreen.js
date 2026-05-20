import { useLayoutEffect } from "react";
import { View, Text, StyleSheet, I18nManager } from "react-native";
import { showAlert } from "../utils/showAlert";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch } from "react-redux";
import { updateProfileThunk } from "../store/slices/authSlice";
import { getServiceIconName } from "../utils/serviceTypeIcons";
import { useWeretScreenChrome } from "../hooks/useWeretScreenChrome";
import WeretAmbientBackground from "../components/ui/weret/WeretAmbientBackground";
import WeretScreenHeader from "../components/ui/weret/WeretScreenHeader";
import WeretStepHeader from "../components/ui/weret/WeretStepHeader";
import WeretOptionCard from "../components/ui/weret/WeretOptionCard";

export default function DriverVehicleCategoryScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { colors, spacing } = useWeretScreenChrome();
  const rtl = I18nManager.isRTL;

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const onCar = () => navigation.navigate("DriverVehicleList", { filter: "car" });

  const onMotorcycle = async () => {
    try {
      await dispatch(updateProfileThunk({ vehicleType: "motorcycle" })).unwrap();
      showAlert(t("success"), t("vehicleClassSaved"));
      navigation.goBack();
    } catch (e) {
      showAlert(t("error"), e?.message || String(e));
    }
  };

  const SeatMeta = ({ color, seats }) => (
    <View style={[styles.metaRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
      <View style={[styles.dot, { backgroundColor: color, borderColor: colors.border }]} />
      <Text style={{ color: colors.textMuted, fontWeight: "700", fontSize: 12 }}>
        {t("seats")}: {seats}
      </Text>
    </View>
  );

  return (
    <WeretAmbientBackground>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <WeretScreenHeader colors={colors} spacing={spacing} onBack={() => navigation.goBack()} onClose={() => navigation.goBack()} />
        <View style={{ paddingHorizontal: spacing.lg, flex: 1 }}>
          <WeretStepHeader title={t("driverPickVehicleTitle")} subtitle={t("driverChooseVehicleSubtitle")} colors={colors} spacing={spacing} />
          <WeretOptionCard
            title={t("driverVehicleByCar")}
            subtitle={t("driverPickVehicleCarListTitle")}
            iconName={getServiceIconName("car_standard")}
            onPress={onCar}
            colors={colors}
            meta={<SeatMeta color={colors.text} seats={4} />}
          />
          <WeretOptionCard
            title={t("driverVehicleByBike")}
            subtitle={t("vehicleType_motorcycle")}
            iconName={getServiceIconName("motorcycle")}
            onPress={onMotorcycle}
            colors={colors}
            meta={<SeatMeta color={colors.accent} seats={1} />}
          />
        </View>
      </View>
    </WeretAmbientBackground>
  );
}

const styles = StyleSheet.create({
  metaRow: { alignItems: "center", gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 999, borderWidth: 1 },
});
