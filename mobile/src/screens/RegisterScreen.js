import { useState, useLayoutEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  I18nManager,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { registerThunk, clearError } from "../store/slices/authSlice";
import LanguageBar from "../components/LanguageBar";
import ConnectionStatusBanner from "../components/ConnectionStatusBanner";
import FormErrorCallout from "../components/ui/FormErrorCallout";
import WeretWordmarkOnLight from "../components/auth/WeretWordmarkOnLight";
import WeretTextField from "../components/auth/WeretTextField";
import CustomButton from "../components/CustomButton";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { weretAuth as A } from "../theme/weretAuth";

const POST_REGISTER_DRIVER_FLAG = "@post_register_driver_onboarding";

export default function RegisterScreen({ navigation }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { loading, error } = useSelector((s) => s.auth);
  const rtl = I18nManager.isRTL;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [intent, setIntent] = useState("passenger");

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t("register"),
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
      if (intent === "driver") {
        await AsyncStorage.setItem(POST_REGISTER_DRIVER_FLAG, "1");
      } else {
        await AsyncStorage.removeItem(POST_REGISTER_DRIVER_FLAG);
      }
      await dispatch(
        registerThunk({
          name: name.trim(),
          email: email.trim(),
          password,
          phone: phone.trim(),
        })
      ).unwrap();
    } catch {
      if (intent === "driver") {
        await AsyncStorage.removeItem(POST_REGISTER_DRIVER_FLAG);
      }
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: A.bg }}>
      <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: "center", marginBottom: 12 }}>
          <WeretWordmarkOnLight label={t("appName")} fontSize={32} />
          <Text style={{ marginTop: 8, color: A.muted, fontWeight: "600", textAlign: "center", paddingHorizontal: 12 }}>
            {t("registerRoleHint")}
          </Text>
        </View>
        <LanguageBar variant="weret" />
        <ConnectionStatusBanner compact />

        <View style={{ flexDirection: rtl ? "row-reverse" : "row", flexWrap: "wrap", gap: 10, marginBottom: 16, marginTop: 8 }}>
          {[
            { key: "passenger", label: t("registerContinuePassenger") },
            { key: "driver", label: t("registerBecomeDriver") },
          ].map((r) => {
            const selected = intent === r.key;
            return (
              <Pressable
                key={r.key}
                onPress={() => setIntent(r.key)}
                style={[
                  styles.roleChip,
                  {
                    borderColor: selected ? A.ink : A.border,
                    backgroundColor: selected ? A.ink : A.field,
                  },
                ]}
              >
                <Text style={{ color: selected ? A.onPrimary : A.ink, fontWeight: "800", fontSize: 13 }}>{r.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <WeretTextField label={t("name")} value={name} onChangeText={setName} />
        <WeretTextField label={t("email")} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <WeretTextField label={t("password")} value={password} onChangeText={setPassword} secureTextEntry />
        <WeretTextField label={t("phone")} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder={t("phonePlaceholder")} />
        <FormErrorCallout message={error} />
        <CustomButton
          title={intent === "driver" ? t("registerNext") : t("register")}
          variant="ink"
          onPress={onRegister}
          loading={loading}
          disabled={loading}
        />
        <View style={{ marginTop: 16, alignItems: "center" }}>
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={{ color: A.ink, fontWeight: "700" }}>{t("login")}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  roleChip: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
  },
});
