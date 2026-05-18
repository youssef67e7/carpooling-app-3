import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Platform } from "react-native";
import { useTranslation } from "react-i18next";
import { useTabScreenOptions } from "./useTabScreenOptions";
import PassengerMoreMenuScreen from "../screens/more/PassengerMoreMenuScreen";
import HelpCenterScreen from "../screens/more/HelpCenterScreen";
import SafetyTipsScreen from "../screens/more/SafetyTipsScreen";
import AboutAmeenScreen from "../screens/more/AboutAmeenScreen";
import SavedPlacesScreen from "../screens/more/SavedPlacesScreen";
import RideTipsScreen from "../screens/more/RideTipsScreen";
import NotificationSettingsScreen from "../screens/more/NotificationSettingsScreen";
import WalletOverviewScreen from "../screens/wallet/WalletOverviewScreen";
import WalletDepositScreen from "../screens/wallet/WalletDepositScreen";
import WalletWithdrawScreen from "../screens/wallet/WalletWithdrawScreen";
import WalletHistoryScreen from "../screens/wallet/WalletHistoryScreen";
import WalletAddAccountScreen from "../screens/wallet/WalletAddAccountScreen";
import DriverOnboardingScreen from "../screens/DriverOnboardingScreen";

const Stack = createNativeStackNavigator();

export default function PassengerMoreStack() {
  const { t } = useTranslation();
  const tabBase = useTabScreenOptions();

  return (
    <Stack.Navigator
      screenOptions={{
        ...tabBase,
        headerBackTitleVisible: false,
        animation: Platform.OS === "ios" ? "default" : "slide_from_right",
      }}
    >
      <Stack.Screen name="MoreMenu" component={PassengerMoreMenuScreen} options={{ title: t("tabMore") }} />
      <Stack.Screen name="WalletOverview" component={WalletOverviewScreen} options={{ title: t("walletTitle") }} />
      <Stack.Screen name="WalletDeposit" component={WalletDepositScreen} options={{ title: t("walletAddMoney") }} />
      <Stack.Screen name="WalletWithdraw" component={WalletWithdrawScreen} options={{ title: t("walletWithdraw") }} />
      <Stack.Screen name="WalletHistory" component={WalletHistoryScreen} options={{ title: t("walletHistory") }} />
      <Stack.Screen name="WalletAddAccount" component={WalletAddAccountScreen} options={{ title: t("walletAddMethod") }} />
      <Stack.Screen name="DriverOnboarding" component={DriverOnboardingScreen} options={{ title: t("driverRegNavTitle") }} />
      <Stack.Screen name="RideTips" component={RideTipsScreen} options={{ title: t("featureRideTips") }} />
      <Stack.Screen name="SavedPlaces" component={SavedPlacesScreen} options={{ title: t("featureSavedPlaces") }} />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{ title: t("featureNotifications") }}
      />
      <Stack.Screen name="HelpCenter" component={HelpCenterScreen} options={{ title: t("featureHelp") }} />
      <Stack.Screen name="SafetyTips" component={SafetyTipsScreen} options={{ title: t("featureSafety") }} />
      <Stack.Screen name="AboutAmeen" component={AboutAmeenScreen} options={{ title: t("featureAbout") }} />
    </Stack.Navigator>
  );
}
