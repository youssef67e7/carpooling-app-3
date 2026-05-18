import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Platform } from "react-native";
import { useTranslation } from "react-i18next";
import { useWeretTabScreenOptions } from "./useWeretTabScreenOptions";
import DriverMoreMenuScreen from "../screens/more/DriverMoreMenuScreen";
import HelpCenterScreen from "../screens/more/HelpCenterScreen";
import SafetyTipsScreen from "../screens/more/SafetyTipsScreen";
import AboutAmeenScreen from "../screens/more/AboutAmeenScreen";
import DriverInsightsScreen from "../screens/more/DriverInsightsScreen";
import DriverTripFlowScreen from "../screens/more/DriverTripFlowScreen";
import DriverEarningsScreen from "../screens/more/DriverEarningsScreen";
import DriverVehicleScreen from "../screens/more/DriverVehicleScreen";
import DriverRatingsScreen from "../screens/more/DriverRatingsScreen";
import DriverDemandScreen from "../screens/more/DriverDemandScreen";
import WalletOverviewScreen from "../screens/wallet/WalletOverviewScreen";
import WalletDepositScreen from "../screens/wallet/WalletDepositScreen";
import WalletWithdrawScreen from "../screens/wallet/WalletWithdrawScreen";
import WalletHistoryScreen from "../screens/wallet/WalletHistoryScreen";
import WalletAddAccountScreen from "../screens/wallet/WalletAddAccountScreen";
import DriverPaymentMethodsScreen from "../screens/DriverPaymentMethodsScreen";
import DriverHistoryScreen from "../screens/DriverHistoryScreen";
import DriverVehicleCategoryScreen from "../screens/DriverVehicleCategoryScreen";
import DriverVehiclePickerScreen from "../screens/DriverVehiclePickerScreen";
import DriverOnboardingScreen from "../screens/DriverOnboardingScreen";
import DriverCarsScreen from "../screens/DriverCarsScreen";
import DriverCarEditorScreen from "../screens/DriverCarEditorScreen";

const Stack = createNativeStackNavigator();

export default function DriverMoreStack() {
  const { t } = useTranslation();
  const tabBase = useWeretTabScreenOptions();

  return (
    <Stack.Navigator
      screenOptions={{
        ...tabBase,
        headerBackTitleVisible: false,
        animation: Platform.OS === "ios" ? "default" : "slide_from_right",
      }}
    >
      <Stack.Screen name="MoreMenu" component={DriverMoreMenuScreen} options={{ title: t("tabMore") }} />
      <Stack.Screen name="DriverWallet" component={WalletOverviewScreen} options={{ title: t("driverMenuWallet") }} />
      <Stack.Screen name="WalletDeposit" component={WalletDepositScreen} options={{ title: t("walletAddMoney") }} />
      <Stack.Screen name="WalletWithdraw" component={WalletWithdrawScreen} options={{ title: t("walletWithdraw") }} />
      <Stack.Screen name="WalletHistory" component={WalletHistoryScreen} options={{ title: t("walletHistory") }} />
      <Stack.Screen name="WalletAddAccount" component={WalletAddAccountScreen} options={{ title: t("walletAddMethod") }} />
      <Stack.Screen name="DriverPaymentMethods" component={DriverPaymentMethodsScreen} options={{ title: t("paymentMethodsTitle") }} />
      <Stack.Screen name="DriverTripsMap" component={DriverHistoryScreen} options={{ title: t("driverMenuTripsMap") }} />
      <Stack.Screen
        name="DriverChooseVehicle"
        component={DriverVehicleCategoryScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="DriverVehicleList"
        component={DriverVehiclePickerScreen}
        options={{ title: t("driverChooseVehicleHeader") }}
      />
      <Stack.Screen
        name="DriverOnboarding"
        component={DriverOnboardingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="DriverCars" component={DriverCarsScreen} options={{ title: t("driverMyCarsTitle") }} />
      <Stack.Screen name="DriverCarEditor" component={DriverCarEditorScreen} options={{ title: t("driverAddCar") }} />
      <Stack.Screen name="DriverTripFlow" component={DriverTripFlowScreen} options={{ title: t("featureDriverTripFlow") }} />
      <Stack.Screen name="DriverEarnings" component={DriverEarningsScreen} options={{ title: t("featureDriverEarningsPage") }} />
      <Stack.Screen name="DriverDemand" component={DriverDemandScreen} options={{ title: t("featureDriverDemand") }} />
      <Stack.Screen name="DriverInsights" component={DriverInsightsScreen} options={{ title: t("featureDriverInsights") }} />
      <Stack.Screen name="DriverVehicle" component={DriverVehicleScreen} options={{ title: t("featureDriverVehicle") }} />
      <Stack.Screen name="DriverRatings" component={DriverRatingsScreen} options={{ title: t("featureDriverRatings") }} />
      <Stack.Screen name="HelpCenter" component={HelpCenterScreen} options={{ title: t("featureHelp") }} />
      <Stack.Screen name="SafetyTips" component={SafetyTipsScreen} options={{ title: t("featureSafety") }} />
      <Stack.Screen name="AboutAmeen" component={AboutAmeenScreen} options={{ title: t("featureAbout") }} />
    </Stack.Navigator>
  );
}
