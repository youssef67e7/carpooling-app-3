import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import DriverHomeScreen from "../screens/DriverHomeScreen";
import DriverHistoryScreen from "../screens/DriverHistoryScreen";
import SettingsScreen from "../screens/SettingsScreen";
import DriverMoreStack from "./DriverMoreStack";
import TabHeaderQuickActions from "../components/TabHeaderQuickActions";
import { useWeretTabScreenOptions } from "./useWeretTabScreenOptions";

const Tab = createBottomTabNavigator();

export default function DriverTabNavigator() {
  const { t } = useTranslation();
  const tabBase = useWeretTabScreenOptions();

  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        ...tabBase,
        headerRight: () => <TabHeaderQuickActions routeName={route.name} navigation={navigation} />,
        tabBarIcon: ({ color, size }) => {
          let iconName = "car-outline";
          if (route.name === "History") iconName = "time-outline";
          if (route.name === "More") iconName = "apps-outline";
          if (route.name === "Settings") iconName = "settings-outline";
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={DriverHomeScreen}
        options={{ title: t("appName"), tabBarLabel: t("tabHome") }}
      />
      <Tab.Screen name="History" component={DriverHistoryScreen} options={{ title: t("history"), tabBarLabel: t("history") }} />
      <Tab.Screen name="More" component={DriverMoreStack} options={{ headerShown: false, tabBarLabel: t("tabMore") }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: t("settings"), tabBarLabel: t("settings") }} />
    </Tab.Navigator>
  );
}
