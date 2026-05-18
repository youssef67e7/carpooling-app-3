import { useState, useLayoutEffect } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Pressable, I18nManager, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { registerThunk, clearError } from "../store/slices/authSlice";
import LanguageBar from "../components/LanguageBar";
import ConnectionStatusBanner from "../components/ConnectionStatusBanner";
import FormErrorCallout from "../components/ui/FormErrorCallout";
import WeretBrandMark from "../components/auth/WeretBrandMark";
import WeretTextField from "../components/auth/WeretTextField";
import CustomButton from "../components/CustomButton";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { weretAuth as A } from "../theme/weretAuth";

const POST_REGISTER_DRIVER_FLAG = "@post_register_driver_onboarding";

export default function PassengerRegisterScreen({ navigation }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { loading, error } = useSelector((s) => s.auth);
  const rtl = I18nManager.isRTL;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t("passenger"),
      headerStyle: { backgroundColor: A.bg },
      headerTintColor: A.ink,
      headerTitleStyle: { fontWeight: "800", color: A.ink },
      headerShadowVisible: false,
    });
  }, [navigation, t]);

  async function onRegister() {
    dispatch(clearError());
    if (!name.trim() || !email.trim() || !password) return;
    if (!phone.trim()) return;
    try {
      await AsyncStorage.removeItem(POST_REGISTER_DRIVER_FLAG);
      await dispatch(
        registerThunk({
          name: name.trim(),
          email: email.trim(),
          password,
          phone: phone.trim(),
        })
      ).unwrap();
    } catch {
      // handled by slice
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: A.bg }}>
      <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: "center", marginBottom: 12 }}>
          <WeretBrandMark title={t("appName")} subtitle={t("passenger")} tone="onLight" size={26} />
        </View>
        <LanguageBar variant="weret" />
        <ConnectionStatusBanner compact />

        <WeretTextField label={t("name")} value={name} onChangeText={setName} />
        <WeretTextField
          label={t("email")}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <WeretTextField label={t("password")} value={password} onChangeText={setPassword} secureTextEntry />
        <WeretTextField
          label={t("phone")}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder={t("phonePlaceholder")}
        />

        <FormErrorCallout message={error} />
        <CustomButton title={t("register")} variant="ink" onPress={onRegister} loading={loading} disabled={loading} />

        <View style={{ marginTop: 18, alignItems: "center" }}>
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={{ color: A.muted, fontWeight: "700", textAlign: rtl ? "right" : "center" }}>{t("registerRoleHint")}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
