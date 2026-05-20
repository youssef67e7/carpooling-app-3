import { useTranslation } from "react-i18next";
import { useWeretScreenChrome } from "../../hooks/useWeretScreenChrome";
import WeretListScreen from "../../components/ui/weret/WeretListScreen";
import WeretMenuHero from "../../components/ui/weret/WeretMenuHero";
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

  const rows = [
    { icon: "map-outline", title: t("driverMenuTripsMap"), sub: t("driverMenuTripsMapSubtitle"), nav: "DriverTripsMap" },
    { icon: "wallet-outline", title: t("driverMenuWallet"), sub: t("driverWalletPayments"), nav: "DriverWallet" },
    { icon: "car-sport-outline", title: t("driverChooseVehicleHeader"), sub: t("driverChooseVehicleSubtitle"), nav: "DriverChooseVehicle" },
    { icon: "car-outline", title: t("driverMyCarsTitle"), sub: t("driverMyCarsSubtitle"), nav: "DriverCars" },
    { icon: "navigate-outline", title: t("featureDriverTripFlow"), sub: t("featureDriverTripFlowSubtitle"), nav: "DriverTripFlow" },
    { icon: "wallet-outline", title: t("featureDriverEarningsPage"), sub: t("featureDriverEarningsPageSubtitle"), nav: "DriverEarnings" },
    { icon: "flash-outline", title: t("featureDriverDemand"), sub: t("featureDriverDemandSubtitle"), nav: "DriverDemand" },
    { icon: "trending-up-outline", title: t("featureDriverInsights"), sub: t("featureDriverInsightsSubtitle"), nav: "DriverInsights" },
    { icon: "car-sport-outline", title: t("featureDriverVehicle"), sub: t("featureDriverVehicleSubtitle"), nav: "DriverVehicle" },
    { icon: "star-half-outline", title: t("featureDriverRatings"), sub: t("featureDriverRatingsSubtitle"), nav: "DriverRatings" },
    { icon: "help-circle-outline", title: t("featureHelp"), sub: t("featureHelpSubtitle"), nav: "HelpCenter" },
    { icon: "shield-checkmark-outline", title: t("featureSafety"), sub: t("featureSafetySubtitle"), nav: "SafetyTips" },
    { icon: "information-circle-outline", title: t("featureAbout"), sub: t("featureAboutSubtitle"), nav: "AboutAmeen" },
  ];

  return (
    <WeretListScreen contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl * 2 }}>
      <WeretMenuHero name={user?.name} roleLabel={t("modeDriver")} colors={colors} spacing={spacing} />
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
      {rows.map((r) => (
        <MoreMenuRow
          key={r.nav}
          icon={r.icon}
          title={r.title}
          subtitle={r.sub}
          onPress={() => navigation.navigate(r.nav)}
          colors={colors}
          spacing={spacing}
          radius={radius}
        />
      ))}
    </WeretListScreen>
  );
}
