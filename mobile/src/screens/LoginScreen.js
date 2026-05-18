import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  I18nManager,
  Pressable,
} from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { loginThunk, clearError } from "../store/slices/authSlice";
import { useWeretGoogleSignIn } from "../hooks/useWeretGoogleSignIn";
import LanguageBar from "../components/LanguageBar";
import ConnectionStatusBanner from "../components/ConnectionStatusBanner";
import FormErrorCallout from "../components/ui/FormErrorCallout";
import WeretPillButton from "../components/auth/WeretPillButton";
import WeretTextField from "../components/auth/WeretTextField";
import CustomButton from "../components/CustomButton";
import { weretAuth as A } from "../theme/weretAuth";
import { weretPress } from "../theme/weretDesignSystem";
import { weretEnter } from "../theme/weretMotion";
import WeretWordmarkOnLight from "../components/auth/WeretWordmarkOnLight";

export default function LoginScreen({ navigation }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { loading, error } = useSelector((s) => s.auth);
  const { signIn: signInWithGoogle, configured: googleConfigured } = useWeretGoogleSignIn();
  const insets = useSafeAreaInsets();
  const rtl = I18nManager.isRTL;
  const [step, setStep] = useState("welcome");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function onLogin() {
    dispatch(clearError());
    await dispatch(loginThunk({ email: email.trim(), password }));
  }

  const keyboardOffset = Platform.OS === "ios" ? insets.top + 4 : 0;

  if (step === "welcome") {
    return (
      <View style={[styles.welcomeRoot, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 20 }]}>
        <Animated.View entering={weretEnter.screen} style={styles.welcomeFill}>
          <View style={styles.welcomeTopBar}>
            <LanguageBar variant="weret" />
          </View>
          <View style={styles.welcomeCenter}>
            <Animated.View entering={weretEnter.brand}>
              <WeretWordmarkOnLight label={t("appName")} fontSize={44} />
            </Animated.View>
          </View>
          <Animated.View entering={weretEnter.row} style={styles.welcomeBottom}>
            <WeretPillButton
              title={t("weretContinuePhone")}
              icon={<MaterialCommunityIcons name="phone-outline" size={22} color={A.onPrimary} />}
              onPress={() => setStep("form")}
              disabled={loading}
              style={[styles.welcomeCta, styles.welcomeCtaFirst]}
            />
            <WeretPillButton
              title={t("weretContinueGoogle")}
              icon={<MaterialCommunityIcons name="google" size={22} color={A.onPrimary} />}
              onPress={() => signInWithGoogle()}
              disabled={loading}
              loading={loading && googleConfigured}
              style={styles.welcomeCta}
            />
            {!googleConfigured ? (
              <Text style={[styles.hint, { textAlign: "center", marginTop: 10 }]}>{t("weretGoogleDevHint")}</Text>
            ) : null}
            {error ? (
              <Text style={[styles.errWelcome, { textAlign: "center", marginTop: 10 }]}>{error}</Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate("Register")}
              style={({ pressed }) => ({ marginTop: 22, opacity: pressed ? weretPress.opacity : 1 })}
            >
              <Text style={[styles.link, { textAlign: "center" }]}>{t("register")}</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={keyboardOffset}
      style={[styles.root, styles.formRoot]}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 22,
          paddingTop: Math.max(insets.top, 12),
          paddingBottom: Math.max(insets.bottom, 24) + 24,
        }}
      >
        <Pressable onPress={() => setStep("welcome")} style={({ pressed }) => ({ marginBottom: 12, opacity: pressed ? 0.6 : 1 })}>
          <Text style={[styles.backLink, { textAlign: rtl ? "right" : "left" }]}>{t("weretBackToWelcome")}</Text>
        </Pressable>

        <WeretWordmarkOnLight label={t("appName")} fontSize={32} />
        <Text style={[styles.loginSubtitle, { textAlign: rtl ? "right" : "center", marginTop: 8 }]}>
          {t("loginSubtitle")}
        </Text>

        <View style={{ marginTop: 20 }}>
          <LanguageBar variant="weret" />
          <ConnectionStatusBanner compact />
        </View>

        <WeretTextField
          label={t("email")}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <WeretTextField label={t("password")} value={password} onChangeText={setPassword} secureTextEntry />

        <FormErrorCallout message={error} />

        <CustomButton title={t("login")} variant="ink" onPress={onLogin} loading={loading} disabled={loading} />

        <Pressable
          onPress={() => navigation.navigate("Register")}
          style={({ pressed }) => ({ marginTop: 18, opacity: pressed ? weretPress.opacity : 1, alignItems: "center" })}
        >
          <Text style={styles.link}>{t("register")}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: A.bg,
  },
  formRoot: {
    backgroundColor: A.bg,
  },
  welcomeRoot: {
    flex: 1,
    backgroundColor: A.bg,
  },
  welcomeFill: {
    flex: 1,
  },
  welcomeTopBar: {
    paddingHorizontal: 16,
    alignItems: "center",
  },
  welcomeCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  welcomeBottom: {
    paddingHorizontal: 24,
    width: "100%",
    alignSelf: "center",
    maxWidth: 440,
  },
  welcomeCta: {
    marginTop: 12,
    width: "100%",
    alignSelf: "stretch",
  },
  welcomeCtaFirst: {
    marginTop: 0,
  },
  loginSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: A.muted,
    letterSpacing: 0.3,
    maxWidth: 320,
    alignSelf: "center",
  },
  link: {
    color: A.muted,
    fontWeight: "700",
    fontSize: 15,
  },
  backLink: {
    color: A.ink,
    fontWeight: "800",
    fontSize: 15,
  },
  hint: {
    color: A.muted,
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 8,
  },
  errWelcome: {
    color: A.danger,
    fontSize: 13,
    fontWeight: "700",
    paddingHorizontal: 12,
  },
});
