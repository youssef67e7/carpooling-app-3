import { ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../context/ThemeProvider";
import MoreMenuRow from "./MoreMenuRow";
import ModeSwitchRow from "./ModeSwitchRow";
import { useDispatch, useSelector } from "react-redux";
import { switchRoleThunk } from "../../store/slices/authSlice";
import { showAlert } from "../../utils/showAlert";

export default function PassengerMoreMenuScreen({ navigation }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { colors, spacing, radius } = useTheme();
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
            if (next === "driver") navigation.navigate("DriverOnboarding");
          }
        }}
        colors={colors}
        spacing={spacing}
        radius={radius}
        t={t}
      />
      <MoreMenuRow
        icon="wallet-outline"
        title={t("walletTitle")}
        subtitle={t("featureWalletSubtitle")}
        onPress={() => navigation.navigate("WalletOverview")}
        colors={colors}
        spacing={spacing}
        radius={radius}
      />
      <MoreMenuRow
        icon="car-sport-outline"
        title={t("becomeDriverTitle")}
        subtitle={t("becomeDriverSubtitle")}
        onPress={() => navigation.navigate("DriverOnboarding")}
        colors={colors}
        spacing={spacing}
        radius={radius}
      />
      <MoreMenuRow
        icon="map-outline"
        title={t("featureRideTips")}
        subtitle={t("featureRideTipsSubtitle")}
        onPress={() => navigation.navigate("RideTips")}
        colors={colors}
        spacing={spacing}
        radius={radius}
      />
      <MoreMenuRow
        icon="bookmark-outline"
        title={t("featureSavedPlaces")}
        subtitle={t("featureSavedPlacesSubtitle")}
        onPress={() => navigation.navigate("SavedPlaces")}
        colors={colors}
        spacing={spacing}
        radius={radius}
      />
      <MoreMenuRow
        icon="notifications-outline"
        title={t("featureNotifications")}
        subtitle={t("featureNotificationsSubtitle")}
        onPress={() => navigation.navigate("NotificationSettings")}
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
