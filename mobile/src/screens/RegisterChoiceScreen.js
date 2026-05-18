import { useLayoutEffect } from "react";
import { View, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../context/ThemeProvider";
import LanguageBar from "../components/LanguageBar";
import ConnectionStatusBanner from "../components/ConnectionStatusBanner";
import WeretBrandMark from "../components/auth/WeretBrandMark";
import WeretPillButton from "../components/auth/WeretPillButton";
import { weretAuth as A } from "../theme/weretAuth";

export default function RegisterChoiceScreen({ navigation }) {
  const { t } = useTranslation();
  const { spacing } = useTheme();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t("register"),
      headerShown: true,
      headerStyle: { backgroundColor: A.bg },
      headerTintColor: A.ink,
      headerTitleStyle: { fontWeight: "800", color: A.ink },
      headerShadowVisible: false,
    });
  }, [navigation, t]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: A.bg }}
      contentContainerStyle={{
        padding: spacing.lg,
        paddingBottom: spacing.xl * 2,
        flexGrow: 1,
      }}
    >
      <View style={{ alignItems: "center", marginBottom: spacing.lg }}>
        <WeretBrandMark title={t("appName")} subtitle={t("registerRoleHint")} tone="onLight" size={32} />
      </View>
      <LanguageBar variant="weret" />
      <ConnectionStatusBanner compact />

      <View style={{ marginTop: spacing.lg, gap: 12 }}>
        <WeretPillButton title={t("registerContinuePassenger")} onPress={() => navigation.navigate("PassengerRegister")} />
        <WeretPillButton
          variant="outline"
          title={t("registerBecomeDriver")}
          onPress={() => navigation.navigate("DriverRegister")}
        />
        <WeretPillButton variant="outline" title={t("login")} onPress={() => navigation.goBack()} />
      </View>
    </ScrollView>
  );
}
