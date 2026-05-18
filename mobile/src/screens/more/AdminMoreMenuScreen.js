import { ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../context/ThemeProvider";
import MoreMenuRow from "./MoreMenuRow";

export default function AdminMoreMenuScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors, spacing, radius } = useTheme();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
      <MoreMenuRow
        icon="construct-outline"
        title={t("featureAdminTools")}
        subtitle={t("featureAdminToolsSubtitle")}
        onPress={() => navigation.navigate("AdminTools")}
        colors={colors}
        spacing={spacing}
        radius={radius}
      />
      <MoreMenuRow
        icon="flag-outline"
        title={t("adminReportsTitle")}
        subtitle={t("adminReportsMenuSubtitle")}
        onPress={() => navigation.navigate("AdminReports")}
        colors={colors}
        spacing={spacing}
        radius={radius}
      />
      <MoreMenuRow
        icon="receipt-outline"
        title={t("adminTransactionsTitle")}
        subtitle={t("adminTransactionsMenuSubtitle")}
        onPress={() => navigation.navigate("AdminTransactions")}
        colors={colors}
        spacing={spacing}
        radius={radius}
      />
      <MoreMenuRow
        icon="list-outline"
        title={t("adminAuditTitle")}
        subtitle={t("adminAuditSubtitle")}
        onPress={() => navigation.navigate("AdminAuditLog")}
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
