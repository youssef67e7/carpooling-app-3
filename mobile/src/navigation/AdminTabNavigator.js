import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import AdminDashboardScreen from "../screens/AdminDashboardScreen";
import AdminUsersScreen from "../screens/AdminUsersScreen";
import AdminRidesScreen from "../screens/AdminRidesScreen";
import SettingsScreen from "../screens/SettingsScreen";
import AdminMoreStack from "./AdminMoreStack";
import { useTabScreenOptions } from "./useTabScreenOptions";

const Tab = createBottomTabNavigator();

export default function AdminTabNavigator() {
  const { t } = useTranslation();
  const tabBase = useTabScreenOptions();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...tabBase,
        headerTitleAlign: "center",
        tabBarIcon: ({ color, size }) => {
          let iconName = "speedometer-outline";
          if (route.name === "Users") iconName = "people-outline";
          if (route.name === "Rides") iconName = "map-outline";
          if (route.name === "More") iconName = "apps-outline";
          if (route.name === "Settings") iconName = "settings-outline";
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={AdminDashboardScreen}
        options={{ title: t("admin"), tabBarLabel: t("tabAdminHome") }}
      />
      <Tab.Screen name="Users" component={AdminUsersScreen} options={{ title: t("adminUsers"), tabBarLabel: t("adminUsers") }} />
      <Tab.Screen name="Rides" component={AdminRidesScreen} options={{ title: t("adminRides"), tabBarLabel: t("adminRides") }} />
      <Tab.Screen name="More" component={AdminMoreStack} options={{ headerShown: false, tabBarLabel: t("tabMore") }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: t("settings"), tabBarLabel: t("settings") }} />
    </Tab.Navigator>
  );
}
