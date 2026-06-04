import { useTranslation } from "react-i18next";
import { useWeretScreenChrome } from "../../hooks/useWeretScreenChrome";
import WeretListScreen from "../../components/ui/weret/WeretListScreen";
import WeretMenuHero from "../../components/ui/weret/WeretMenuHero";
import MoreMenuRow from "./MoreMenuRow";
import ModeSwitchRow from "./ModeSwitchRow";
import { useDispatch, useSelector } from "react-redux";
import { switchRoleThunk } from "../../store/slices/authSlice";
import { showAlert } from "../../utils/showAlert";

const MENU_ROWS = [
  { key: "wallet", icon: "wallet-outline", titleKey: "walletTitle", subKey: "featureWalletSubtitle", nav: "WalletOverview" },
  { key: "driver", icon: "car-sport-outline", titleKey: "becomeDriverTitle", subKey: "becomeDriverSubtitle", nav: "DriverOnboarding" },
  { key: "tips", icon: "map-outline", titleKey: "featureRideTips", subKey: "featureRideTipsSubtitle", nav: "RideTips" },
  { key: "places", icon: "bookmark-outline", titleKey: "featureSavedPlaces", subKey: "featureSavedPlacesSubtitle", nav: "SavedPlaces" },
  { key: "notif", icon: "notifications-outline", titleKey: "featureNotifications", subKey: "featureNotificationsSubtitle", nav: "NotificationSettings" },
  { key: "help", icon: "help-circle-outline", titleKey: "featureHelp", subKey: "featureHelpSubtitle", nav: "HelpCenter" },
  { key: "safety", icon: "shield-checkmark-outline", titleKey: "featureSafety", subKey: "featureSafetySubtitle", nav: "SafetyTips" },
  { key: "about", icon: "information-circle-outline", titleKey: "featureAbout", subKey: "featureAboutSubtitle", nav: "AboutWeret" },
];

export default function PassengerMoreMenuScreen({ navigation }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { colors, spacing, radius } = useWeretScreenChrome();
  const { user, loading } = useSelector((s) => s.auth);
  const current = (user?.active_role || user?.role) === "driver" ? "driver" : "passenger";

  return (
    <WeretListScreen contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl * 2 }}>
      <WeretMenuHero name={user?.name} roleLabel={t("modePassenger")} colors={colors} spacing={spacing} />
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
      {MENU_ROWS.map((row, index) => (
        <MoreMenuRow
          key={row.key}
          index={index}
          icon={row.icon}
          title={t(row.titleKey)}
          subtitle={t(row.subKey)}
          onPress={() => navigation.navigate(row.nav)}
          colors={colors}
          spacing={spacing}
          radius={radius}
        />
      ))}
    </WeretListScreen>
  );
}
