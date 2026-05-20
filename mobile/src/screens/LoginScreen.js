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
import {
  loginThunk,
  clearError,
  phoneOtpRequestThunk,
  phoneOtpVerifyThunk,
} from "../store/slices/authSlice";
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
import WeretAmbientBackground from "../components/ui/weret/WeretAmbientBackground";

export default function LoginScreen({ navigation }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { loading, error } = useSelector((s) => s.auth);
  const { signIn: signInWithGoogle, configured: googleConfigured, ready: googleReady } = useWeretGoogleSignIn();
  const insets = useSafeAreaInsets();
  const rtl = I18nManager.isRTL;
  /** welcome | phone | phoneOtp | email */
  const [step, setStep] = useState("welcome");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtpHint, setDevOtpHint] = useState("");

  async function onLogin() {
    dispatch(clearError());
    await dispatch(loginThunk({ email: email.trim(), password }));
  }

  async function onSendPhoneOtp() {
    dispatch(clearError());
    setDevOtpHint("");
    const trimmed = phone.trim();
    if (!trimmed) return;
    const result = await dispatch(phoneOtpRequestThunk(trimmed));
    if (phoneOtpRequestThunk.fulfilled.match(result)) {
      if (result.payload?._devOtp) {
        setDevOtpHint(t("phoneLoginDevOtp", { code: result.payload._devOtp }));
      }
      setStep("phoneOtp");
    }
  }

  async function onVerifyPhoneOtp() {
    dispatch(clearError());
    if (!phone.trim() || !otp.trim()) return;
    await dispatch(phoneOtpVerifyThunk({ phone: phone.trim(), otp: otp.trim() }));
  }

  const keyboardOffset = Platform.OS === "ios" ? insets.top + 4 : 0;

  if (step === "welcome") {
    return (
      <WeretAmbientBackground style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 20 }}>
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
              onPress={() => {
                dispatch(clearError());
                setStep("phone");
              }}
              disabled={loading}
              style={[styles.welcomeCta, styles.welcomeCtaFirst]}
            />
            <WeretPillButton
              title={t("weretContinueGoogle")}
              icon={<MaterialCommunityIcons name="google" size={22} color={A.onPrimary} />}
              onPress={() => signInWithGoogle()}
              disabled={loading || !googleReady}
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
              onPress={() => {
                dispatch(clearError());
                setStep("email");
              }}
              style={({ pressed }) => ({ marginTop: 16, opacity: pressed ? weretPress.opacity : 1 })}
            >
              <Text style={[styles.link, { textAlign: "center" }]}>{t("weretContinueEmail")}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate("Register")}
              style={({ pressed }) => ({ marginTop: 12, opacity: pressed ? weretPress.opacity : 1 })}
            >
              <Text style={[styles.link, { textAlign: "center" }]}>{t("register")}</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </WeretAmbientBackground>
    );
  }

  const isPhoneFlow = step === "phone" || step === "phoneOtp";

  return (
    <WeretAmbientBackground>
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
          <Pressable
            onPress={() => {
              dispatch(clearError());
              if (step === "phoneOtp") setStep("phone");
              else setStep("welcome");
            }}
            style={({ pressed }) => ({ marginBottom: 12, opacity: pressed ? 0.6 : 1 })}
          >
            <Text style={[styles.backLink, { textAlign: rtl ? "right" : "left" }]}>
              {step === "phoneOtp" ? t("phoneLoginChangeNumber") : t("weretBackToWelcome")}
            </Text>
          </Pressable>

          <WeretWordmarkOnLight label={t("appName")} fontSize={32} />
          <Text style={[styles.loginSubtitle, { textAlign: rtl ? "right" : "center", marginTop: 8 }]}>
            {isPhoneFlow ? t("phoneLoginSubtitle") : t("loginSubtitle")}
          </Text>

          <View style={{ marginTop: 20 }}>
            <LanguageBar variant="weret" />
            <ConnectionStatusBanner compact />
          </View>

          {step === "phone" ? (
            <>
              <WeretTextField
                label={t("phone")}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder={t("phonePlaceholder")}
                autoFocus
              />
              <Text style={[styles.hint, { textAlign: rtl ? "right" : "left", marginBottom: 12 }]}>
                {t("phoneLoginHint")}
              </Text>
              <FormErrorCallout message={error} />
              <CustomButton
                title={t("phoneLoginSendCode")}
                variant="ink"
                onPress={onSendPhoneOtp}
                loading={loading}
                disabled={loading || !phone.trim()}
              />
            </>
          ) : step === "phoneOtp" ? (
            <>
              <Text style={[styles.phoneSent, { textAlign: rtl ? "right" : "left" }]}>{t("phoneLoginSentTo", { phone })}</Text>
              <WeretTextField
                label={t("phoneLoginOtpLabel")}
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                placeholder="123456"
                autoFocus
              />
              {devOtpHint ? (
                <Text style={[styles.devOtp, { textAlign: rtl ? "right" : "left" }]}>{devOtpHint}</Text>
              ) : null}
              <FormErrorCallout message={error} />
              <CustomButton
                title={t("phoneLoginVerify")}
                variant="ink"
                onPress={onVerifyPhoneOtp}
                loading={loading}
                disabled={loading || otp.trim().length < 4}
              />
              <Pressable
                onPress={onSendPhoneOtp}
                disabled={loading}
                style={({ pressed }) => ({ marginTop: 16, opacity: pressed ? 0.7 : 1, alignItems: "center" })}
              >
                <Text style={styles.link}>{t("phoneLoginResend")}</Text>
              </Pressable>
            </>
          ) : (
            <>
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
            </>
          )}

          <Pressable
            onPress={() => {
              dispatch(clearError());
              setStep(isPhoneFlow ? "email" : "phone");
              setOtp("");
            }}
            style={({ pressed }) => ({ marginTop: 18, opacity: pressed ? weretPress.opacity : 1, alignItems: "center" })}
          >
            <Text style={styles.link}>{isPhoneFlow ? t("weretContinueEmail") : t("weretContinuePhone")}</Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate("Register")}
            style={({ pressed }) => ({ marginTop: 12, opacity: pressed ? weretPress.opacity : 1, alignItems: "center" })}
          >
            <Text style={styles.link}>{t("register")}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </WeretAmbientBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: A.bg },
  formRoot: { backgroundColor: A.bg },
  welcomeFill: { flex: 1 },
  welcomeTopBar: { paddingHorizontal: 16, alignItems: "center" },
  welcomeCenter: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 },
  welcomeBottom: { paddingHorizontal: 24, width: "100%", alignSelf: "center", maxWidth: 440 },
  welcomeCta: { marginTop: 12, width: "100%", alignSelf: "stretch" },
  welcomeCtaFirst: { marginTop: 0 },
  loginSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: A.muted,
    letterSpacing: 0.3,
    maxWidth: 320,
    alignSelf: "center",
  },
  phoneSent: { color: A.muted, fontSize: 14, fontWeight: "600", marginBottom: 12, marginTop: 4 },
  devOtp: { color: A.ink, fontSize: 13, fontWeight: "800", marginBottom: 8, backgroundColor: A.field, padding: 10, borderRadius: 10 },
  link: { color: A.muted, fontWeight: "700", fontSize: 15 },
  backLink: { color: A.ink, fontWeight: "800", fontSize: 15 },
  hint: { color: A.muted, fontSize: 12, fontWeight: "600", paddingHorizontal: 4 },
  errWelcome: { color: A.danger, fontSize: 13, fontWeight: "700", paddingHorizontal: 12 },
});
