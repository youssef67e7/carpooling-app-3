import { useState, useLayoutEffect } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable, I18nManager } from "react-native";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { registerThunk, clearError } from "../store/slices/authSlice";
import { useTheme } from "../context/ThemeProvider";
import LanguageBar from "../components/LanguageBar";
import InputField from "../components/InputField";
import CustomButton from "../components/CustomButton";
import ConnectionStatusBanner from "../components/ConnectionStatusBanner";
import FormErrorCallout from "../components/ui/FormErrorCallout";
import AsyncStorage from "@react-native-async-storage/async-storage";

const POST_REGISTER_DRIVER_FLAG = "@post_register_driver_onboarding";

export default function RegisterScreen({ navigation }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { loading, error } = useSelector((s) => s.auth);
  const { colors, spacing, radius } = useTheme();
  const rtl = I18nManager.isRTL;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [intent, setIntent] = useState("passenger"); // passenger | driver

  useLayoutEffect(() => {
    navigation.setOptions({ title: t("register"), headerShown: true });
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
      // handled by slice
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
        <LanguageBar />
        <ConnectionStatusBanner compact />
        <Text style={{ color: colors.textMuted, marginBottom: spacing.xs, textAlign: rtl ? "right" : "left" }}>{t("registerRoleHint")}</Text>
        <View style={{ flexDirection: rtl ? "row-reverse" : "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md }}>
          {[
            { key: "passenger", label: t("registerContinuePassenger") },
            { key: "driver", label: t("registerBecomeDriver") },
          ].map((r) => (
            <Pressable
              key={r.key}
              style={[
                styles.roleChip,
                {
                  borderRadius: radius.full,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  backgroundColor: intent === r.key ? colors.primary : colors.surfaceMuted,
                  borderWidth: 1,
                  borderColor: intent === r.key ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setIntent(r.key)}
            >
              <Text style={{ color: intent === r.key ? colors.primaryText : colors.text, fontWeight: "800" }}>{r.label}</Text>
            </Pressable>
          ))}
        </View>
        <InputField label={t("name")} value={name} onChangeText={setName} />
        <InputField label={t("email")} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <InputField label={t("password")} value={password} onChangeText={setPassword} secureTextEntry />
        <InputField
          label={t("phone")}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder={t("phonePlaceholder")}
        />
        <FormErrorCallout message={error} />
        <CustomButton
          title={intent === "driver" ? t("registerNext") : t("register")}
          onPress={onRegister}
          loading={loading}
          disabled={loading}
        />
        <View style={{ marginTop: spacing.md, alignItems: "center" }}>
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={{ color: colors.primary, fontWeight: "600" }}>{t("login")}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  roleChip: {},
});
