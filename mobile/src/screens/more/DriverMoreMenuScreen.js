import { ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { useWeretScreenChrome } from "../../hooks/useWeretScreenChrome";
import MoreMenuRow from "./MoreMenuRow";
import ModeSwitchRow from "./ModeSwitchRow";
import { useDispatch, useSelector } from "react-redux";
import { switchRoleThunk } from "../../store/slices/authSlice";
import { showAlert } from "../../utils/showAlert";

export default function DriverMoreMenuScreen({ navigation }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { colors, spacing, radius } = useWeretScreenChrome();
  const { user, loading } = useSelector((s) => s.auth);
  const current = (user?.active_role || user?.role) === "driver" ? "driver" : "passenger";

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
      <ModeSwitchRow
        value={current}
        loading={loading}
        disabled={false}
        onChange={async (next) => {
          if (next === current) return;
          try {
            await dispatch(switchRoleThunk({ role: next })).unwrap();
          } catch (e) {
            showAlert(t("error"), String(e));
          }
        }}
        colors={colors}
        spacing={spacing}
        radius={radius}
        t={t}
      />
      <MoreMenuRow
        icon="map-outline"
        title={t("driverMenuTripsMap")}
        subtitle={t("driverMenuTripsMapSubtitle")}
        onPress={() => navigation.navigate("DriverTripsMap")}
        colors={colors}
        spacing={spacing}
        radius={radius}
      />
      <MoreMenuRow
        icon="wallet-outline"
        title={t("driverMenuWallet")}
        subtitle={t("driverWalletPayments")}
        onPress={() => navigation.navigate("DriverWallet")}
        colors={colors}
        spacing={spacing}
        radius={radius}
      />
      <MoreMenuRow
        icon="car-sport-outline"
        title={t("driverChooseVehicleHeader")}
        subtitle={t("driverChooseVehicleSubtitle")}
        onPress={() => navigation.navigate("DriverChooseVehicle")}
        colors={colors}
        spacing={spacing}
        radius={radius}
      />
      <MoreMenuRow
        icon="car-outline"
        title={t("driverMyCarsTitle")}
        subtitle={t("driverMyCarsSubtitle")}
        onPress={() => navigation.navigate("DriverCars")}
        colors={colors}
        spacing={spacing}
        radius={radius}
      />
      <MoreMenuRow
        icon="navigate-outline"
        title={t("featureDriverTripFlow")}
        subtitle={t("featureDriverTripFlowSubtitle")}
        onPress={() => navigation.navigate("DriverTripFlow")}
        colors={colors}
        spacing={spacing}
        radius={radius}
      />
      <MoreMenuRow
        icon="wallet-outline"
        title={t("featureDriverEarningsPage")}
        subtitle={t("featureDriverEarningsPageSubtitle")}
        onPress={() => navigation.navigate("DriverEarnings")}
        colors={colors}
        spacing={spacing}
        radius={radius}
      />
      <MoreMenuRow
        icon="flash-outline"
        title={t("featureDriverDemand")}
        subtitle={t("featureDriverDemandSubtitle")}
        onPress={() => navigation.navigate("DriverDemand")}
        colors={colors}
        spacing={spacing}
        radius={radius}
      />
      <MoreMenuRow
        icon="trending-up-outline"
        title={t("featureDriverInsights")}
        subtitle={t("featureDriverInsightsSubtitle")}
        onPress={() => navigation.navigate("DriverInsights")}
        colors={colors}
        spacing={spacing}
        radius={radius}
      />
      <MoreMenuRow
        icon="car-sport-outline"
        title={t("featureDriverVehicle")}
        subtitle={t("featureDriverVehicleSubtitle")}
        onPress={() => navigation.navigate("DriverVehicle")}
        colors={colors}
        spacing={spacing}
        radius={radius}
      />
      <MoreMenuRow
        icon="star-half-outline"
        title={t("featureDriverRatings")}
        subtitle={t("featureDriverRatingsSubtitle")}
        onPress={() => navigation.navigate("DriverRatings")}
        colors={colors}
        spacing={spacing}
        radius={radius}
      />
      <MoreMenuRow
        icon="help-circle-outline"
        title={t("featureHelp")}
        subtitle={t("featureHelpSubtitle")}
        onPress={() => navigation.navigate("HelpCenter")}
        colors={colors}
        spacing={spacing}
        radius={radius}
      />
      <MoreMenuRow
        icon="shield-checkmark-outline"
        title={t("featureSafety")}
        subtitle={t("featureSafetySubtitle")}
        onPress={() => navigation.navigate("SafetyTips")}
        colors={colors}
        spacing={spacing}
        radius={radius}
      />
      <MoreMenuRow
        icon="information-circle-outline"
        title={t("featureAbout")}
        subtitle={t("featureAboutSubtitle")}
        onPress={() => navigation.navigate("AboutAmeen")}
        colors={colors}
        spacing={spacing}
        radius={radius}
      />
    </ScrollView>
  );
}
