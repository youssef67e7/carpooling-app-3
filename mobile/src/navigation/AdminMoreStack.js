import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { useTabScreenOptions } from "./useTabScreenOptions";
import AdminMoreMenuScreen from "../screens/more/AdminMoreMenuScreen";
import AboutAmeenScreen from "../screens/more/AboutAmeenScreen";
import AdminToolsScreen from "../screens/more/AdminToolsScreen";
import AdminReportsScreen from "../screens/AdminReportsScreen";
import AdminTransactionsScreen from "../screens/AdminTransactionsScreen";
import AdminAuditLogScreen from "../screens/AdminAuditLogScreen";

const Stack = createNativeStackNavigator();

export default function AdminMoreStack() {
  const { t } = useTranslation();
  const tabBase = useTabScreenOptions();

  return (
    <Stack.Navigator screenOptions={{ ...tabBase, headerBackTitleVisible: false }}>
      <Stack.Screen name="MoreMenu" component={AdminMoreMenuScreen} options={{ title: t("tabMore") }} />
      <Stack.Screen name="AdminTools" component={AdminToolsScreen} options={{ title: t("featureAdminTools") }} />
      <Stack.Screen name="AdminReports" component={AdminReportsScreen} options={{ title: t("adminReportsTitle") }} />
      <Stack.Screen name="AdminTransactions" component={AdminTransactionsScreen} options={{ title: t("adminTransactionsTitle") }} />
      <Stack.Screen name="AdminAuditLog" component={AdminAuditLogScreen} options={{ title: t("adminAuditTitle") }} />
      <Stack.Screen name="AboutAmeen" component={AboutAmeenScreen} options={{ title: t("featureAbout") }} />
    </Stack.Navigator>
  );
}
