import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import PassengerHomeScreen from "../screens/PassengerHomeScreen";
import PassengerHistoryScreen from "../screens/PassengerHistoryScreen";
import SettingsScreen from "../screens/SettingsScreen";
import PassengerMoreStack from "./PassengerMoreStack";
import TabHeaderQuickActions from "../components/TabHeaderQuickActions";
import { usePassengerTabScreenOptions } from "./usePassengerTabScreenOptions";

const Tab = createBottomTabNavigator();

export default function PassengerTabNavigator() {
  const { t } = useTranslation();
  const tabBase = usePassengerTabScreenOptions();

  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        ...tabBase,
        headerRight: () => <TabHeaderQuickActions routeName={route.name} navigation={navigation} />,
        tabBarIcon: ({ color, size }) => {
          let iconName = "home";
          if (route.name === "History") iconName = "time-outline";
          if (route.name === "More") iconName = "apps-outline";
          if (route.name === "Settings") iconName = "settings-outline";
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={PassengerHomeScreen}
        options={{ title: t("appName"), tabBarLabel: t("tabHome") }}
      />
      <Tab.Screen name="History" component={PassengerHistoryScreen} options={{ title: t("history"), tabBarLabel: t("history") }} />
      <Tab.Screen name="More" component={PassengerMoreStack} options={{ headerShown: false, tabBarLabel: t("tabMore") }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: t("settings"), tabBarLabel: t("settings") }} />
    </Tab.Navigator>
  );
}
