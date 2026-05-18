import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  I18nManager,
  KeyboardAvoidingView,
  Platform,
  Image,
  Pressable,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, { FadeIn, FadeInUp, SlideInLeft, SlideInRight, SlideOutLeft, SlideOutRight } from "react-native-reanimated";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { useWeretScreenChrome } from "../hooks/useWeretScreenChrome";
import SectionSurface from "../components/ui/SectionSurface";
import InputField from "../components/InputField";
import CustomButton from "../components/CustomButton";
import PressableScale from "../components/ui/PressableScale";
import FormErrorCallout from "../components/ui/FormErrorCallout";
import { showAlert } from "../utils/showAlert";
import { api, apiBaseURL } from "../api/client";
import { applySessionThunk, setUser } from "../store/slices/authSlice";
import { fetchDriverProfileThunk, fetchDriverStatusThunk } from "../store/slices/driverSlice";

const TOTAL = 4;
const DRAFT_KEY = "driver_application_draft_v1";

function toAbsoluteUrl(maybeRelative) {
  const s = String(maybeRelative || "");
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("/")) return `${apiBaseURL}${s}`;
  return s;
}

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());
}

function isValidNationalId(s) {
  return /^[0-9]{10,20}$/.test(String(s || "").trim());
}

function parseExpiry(s) {
  const v = String(s || "").trim();
  if (!v) return null;
  // Accept YYYY-MM-DD (recommended)
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isFutureDate(d) {
  if (!d) return false;
  const now = new Date();
  return d.getTime() > now.getTime();
}

function normalizeSeats(v) {
  const n = Math.floor(Number(v) || 0);
  if (!n) return 0;
  return Math.min(20, Math.max(2, n));
}

async function pickImage() {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (perm.status !== "granted") throw new Error("Permission required");
  const r = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.82,
    allowsEditing: true,
    aspect: [4, 4],
  });
  if (r.canceled) return null;
  const asset = r.assets?.[0];
  if (!asset?.uri) return null;
  return asset;
}

async function uploadPickedAsset(asset, visibility = "public") {
  if (!asset?.uri) throw new Error("Missing image");
  const ext = asset.uri.split(".").pop()?.toLowerCase();
  const type = ext === "png" ? "image/png" : "image/jpeg";
  const name = `upload.${ext === "png" ? "png" : "jpg"}`;
  const fd = new FormData();
  fd.append("image", { uri: asset.uri, name, type });
  fd.append("visibility", visibility === "private" ? "private" : "public");
  const { data } = await api.post("/upload", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data?.url;
}

function UploadCard({ title, subtitle, uri, onPress, busy }) {
  const { colors, spacing, radius } = useWeretScreenChrome();
  const rtl = I18nManager.isRTL;
  const token = useSelector((s) => s.auth.token);
  const isPrivate = typeof uri === "string" && uri.includes("/uploads/private/");
  const imageSource =
    uri && isPrivate && token
      ? { uri, headers: { Authorization: `Bearer ${token}` } }
      : uri
        ? { uri }
        : null;
  return (
    <PressableScale onPress={onPress} disabled={busy} accessibilityRole="button" style={{ flex: 1 }}>
      <SectionSurface style={{ padding: spacing.md }} noEntering>
        <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: spacing.md }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surfaceMuted,
              overflow: "hidden",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {imageSource ? (
              <Animated.View entering={FadeIn.duration(220)} style={{ width: "100%", height: "100%" }}>
                <Image source={imageSource} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
              </Animated.View>
            ) : busy ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Ionicons name="add" size={32} color={colors.textMuted} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: "800", textAlign: rtl ? "right" : "left" }}>{title}</Text>
            {subtitle ? (
              <Text style={{ color: colors.textMuted, marginTop: 4, fontSize: 12, textAlign: rtl ? "right" : "left" }}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          <Ionicons name={rtl ? "chevron-back" : "chevron-forward"} size={18} color={colors.textMuted} />
        </View>
      </SectionSurface>
    </PressableScale>
  );
}

export default function DriverOnboardingScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { colors, spacing, radius } = useWeretScreenChrome();
  const rtl = I18nManager.isRTL;
  const { user } = useSelector((s) => s.auth);
  const driver = useSelector((s) => s.driver);
  const [forceEdit, setForceEdit] = useState(false);

  const [step, setStep] = useState(1);
  const prevStepRef = useRef(1);
  const [busyUploadKey, setBusyUploadKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  // Step 1
  const [fullName, setFullName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [email, setEmail] = useState(user?.email || "");
  const [profileImageUrl, setProfileImageUrl] = useState(user?.profileImageUrl || "");

  // Step 2
  const [criminalFrontUrl, setCriminalFrontUrl] = useState("");
  const [criminalBackUrl, setCriminalBackUrl] = useState("");
  const [nationalIdNumber, setNationalIdNumber] = useState("");

  // Step 3
  const [licenseImageUrl, setLicenseImageUrl] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseExpiry, setLicenseExpiry] = useState("");

  // Step 4
  const [carImageUrl, setCarImageUrl] = useState("");
  const [carBrand, setCarBrand] = useState("");
  const [carModel, setCarModel] = useState("");
  const [carColor, setCarColor] = useState("");
  const [carPlateNumber, setCarPlateNumber] = useState("");
  const [numberOfSeats, setNumberOfSeats] = useState("4");
  const [cars, setCars] = useState([]);
  const [selectedCarIndex, setSelectedCarIndex] = useState(0);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    dispatch(fetchDriverStatusThunk());
    dispatch(fetchDriverProfileThunk());
  }, [dispatch]);

  // Restore draft once.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(DRAFT_KEY);
        if (!raw) return;
        const d = JSON.parse(raw);
        if (!d || typeof d !== "object") return;
        if (d.step) setStep(Math.min(TOTAL, Math.max(1, Number(d.step) || 1)));
        if (d.fullName != null) setFullName(d.fullName);
        if (d.phone != null) setPhone(d.phone);
        if (d.email != null) setEmail(d.email);
        if (d.profileImageUrl != null) setProfileImageUrl(d.profileImageUrl);
        if (d.criminalFrontUrl != null) setCriminalFrontUrl(d.criminalFrontUrl);
        if (d.criminalBackUrl != null) setCriminalBackUrl(d.criminalBackUrl);
        if (d.nationalIdNumber != null) setNationalIdNumber(d.nationalIdNumber);
        if (d.licenseImageUrl != null) setLicenseImageUrl(d.licenseImageUrl);
        if (d.licenseNumber != null) setLicenseNumber(d.licenseNumber);
        if (d.licenseExpiry != null) setLicenseExpiry(d.licenseExpiry);
        if (d.carImageUrl != null) setCarImageUrl(d.carImageUrl);
        if (d.carBrand != null) setCarBrand(d.carBrand);
        if (d.carModel != null) setCarModel(d.carModel);
        if (d.carColor != null) setCarColor(d.carColor);
        if (d.carPlateNumber != null) setCarPlateNumber(d.carPlateNumber);
        if (d.numberOfSeats != null) setNumberOfSeats(String(d.numberOfSeats));
        if (Array.isArray(d.cars)) setCars(d.cars);
        if (d.selectedCarIndex != null) setSelectedCarIndex(Math.max(0, Number(d.selectedCarIndex) || 0));
      } catch {
        /* ignore */
      }
    })();
  }, []);

  // Persist draft (debounced).
  useEffect(() => {
    const id = setTimeout(() => {
      AsyncStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          step,
          fullName,
          phone,
          email,
          profileImageUrl,
          criminalFrontUrl,
          criminalBackUrl,
          nationalIdNumber,
          licenseImageUrl,
          licenseNumber,
          licenseExpiry,
          carImageUrl,
          carBrand,
          carModel,
          carColor,
          carPlateNumber,
          numberOfSeats: normalizeSeats(numberOfSeats),
          cars,
          selectedCarIndex,
        })
      ).catch(() => {});
    }, 220);
    return () => clearTimeout(id);
  }, [
    step,
    fullName,
    phone,
    email,
    profileImageUrl,
    criminalFrontUrl,
    criminalBackUrl,
    nationalIdNumber,
    licenseImageUrl,
    licenseNumber,
    licenseExpiry,
    carImageUrl,
    carBrand,
    carModel,
    carColor,
    carPlateNumber,
    numberOfSeats,
    cars,
    selectedCarIndex,
  ]);

  const progress = step / TOTAL;

  const direction = step >= prevStepRef.current ? "forward" : "back";
  useEffect(() => {
    prevStepRef.current = step;
  }, [step]);

  const entering = useMemo(() => {
    if (rtl) return direction === "forward" ? SlideInLeft.duration(220) : SlideInRight.duration(220);
    return direction === "forward" ? SlideInRight.duration(220) : SlideInLeft.duration(220);
  }, [direction, rtl]);
  const exiting = useMemo(() => {
    if (rtl) return direction === "forward" ? SlideOutLeft.duration(200) : SlideOutRight.duration(200);
    return direction === "forward" ? SlideOutLeft.duration(200) : SlideOutRight.duration(200);
  }, [direction, rtl]);

  function validateCurrentStep() {
    setErr("");
    if (step === 1) {
      if (!fullName.trim()) return t("driverRegErrName");
      if (!phone.trim()) return t("driverRegErrPhone");
      if (!isValidEmail(email)) return t("driverRegErrEmail");
      if (!profileImageUrl) return t("driverRegErrProfilePic");
      return "";
    }
    if (step === 2) {
      if (!criminalFrontUrl || !criminalBackUrl) return t("driverRegErrCriminalDocs");
      if (!isValidNationalId(nationalIdNumber)) return t("driverRegErrNationalId");
      return "";
    }
    if (step === 3) {
      const exp = parseExpiry(licenseExpiry);
      if (!licenseImageUrl) return t("driverRegErrLicenseImage");
      if (!licenseNumber.trim()) return t("driverRegErrLicenseNumber");
      if (!exp || !isFutureDate(exp)) return t("driverRegErrLicenseExpiry");
      return "";
    }
    if (step === 4) {
      if (!Array.isArray(cars) || cars.length < 1) return t("driverRegErrCars");
      if (selectedCarIndex < 0 || selectedCarIndex >= cars.length) return t("driverRegErrCars");
      return "";
    }
    return "";
  }

  function addCarFromForm() {
    setErr("");
    const seats = normalizeSeats(numberOfSeats);
    if (!carImageUrl) return setErr(t("driverRegErrCarImage"));
    if (!carBrand.trim() || !carModel.trim()) return setErr(t("driverRegErrCarSpec"));
    if (!carColor.trim()) return setErr(t("driverRegErrCarColor"));
    if (!carPlateNumber.trim()) return setErr(t("driverRegErrPlate"));
    if (!seats) return setErr(t("driverRegErrSeats"));

    const next = [
      ...(Array.isArray(cars) ? cars : []),
      {
        imageUrl: carImageUrl,
        brand: carBrand.trim(),
        model: carModel.trim(),
        color: carColor.trim(),
        plateNumber: carPlateNumber.trim(),
        seats,
      },
    ];
    setCars(next);
    setSelectedCarIndex(next.length - 1);
    // Keep the form filled for quick edits; user can change and add another.
  }

  async function pickAndUpload(setUrl, key, aspect) {
    setErr("");
    setBusyUploadKey(key);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") throw new Error("Permission required");
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.82,
        allowsEditing: true,
        aspect: aspect || [4, 4],
      });
      if (r.canceled) return;
      const asset = r.assets?.[0];
      const vis =
        key === "crimFront" || key === "crimBack" || key === "licenseImg"
          ? "private"
          : "public";
      const rel = await uploadPickedAsset(asset, vis);
      setUrl(toAbsoluteUrl(rel));
    } catch (e) {
      showAlert(t("error"), String(e?.message || e));
    } finally {
      setBusyUploadKey("");
    }
  }

  async function onNext() {
    const msg = validateCurrentStep();
    if (msg) {
      setErr(msg);
      return;
    }
    if (step < TOTAL) {
      setStep((s) => s + 1);
      return;
    }
    setSubmitting(true);
    setErr("");
    try {
      const exp = parseExpiry(licenseExpiry);
      const payload = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        profileImageUrl,
        criminalRecordFrontUrl: criminalFrontUrl,
        criminalRecordBackUrl: criminalBackUrl,
        nationalIdNumber: nationalIdNumber.trim(),
        licenseImageUrl,
        licenseNumber: licenseNumber.trim(),
        licenseExpiry: exp?.toISOString(),
        cars,
      };
      const { data } = await api.post("/driver-application/submit", payload);
      await AsyncStorage.removeItem(DRAFT_KEY);

      if (data?.token && data?.user) {
        await dispatch(applySessionThunk({ token: data.token, user: data.user })).unwrap();
      } else {
        dispatch(
          setUser({
            ...(user || {}),
            name: payload.fullName,
            email: payload.email,
            phone: payload.phone,
            profileImageUrl: payload.profileImageUrl,
            driver_application_status: data?.status === "approved" ? "approved" : "pending",
            role: data?.user?.role || user?.role,
            active_role: data?.user?.active_role || "driver",
          })
        );
      }
      if (data?.status === "approved") showAlert(t("success"), t("driverRegCompletedApproved"));
      else showAlert(t("success"), t("driverRegCompletedPending"));
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Request failed";
      if (String(msg).includes("Email mismatch")) setErr(t("driverRegEmailMismatch"));
      else if (String(msg).includes("Email already in use")) setErr(t("emailAlreadyInUse"));
      else setErr(msg);
    } finally {
      setSubmitting(false);
    }
  }

  function onBack() {
    if (step > 1) setStep((s) => s - 1);
    else navigation.goBack();
  }

  const applicationStatus = driver?.status?.applicationStatus;
  const profileStatus = driver?.status?.profileStatus;
  const reviewNote = driver?.status?.reviewNote || "";
  const isApproved = applicationStatus === "approved" && profileStatus === "approved";
  const isPending = applicationStatus === "pending" || profileStatus === "pending";
  const isRejected = applicationStatus === "rejected" || profileStatus === "rejected";

  if (!forceEdit && (isApproved || isPending || isRejected)) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.bg }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 6 : 0}
      >
        <View style={{ paddingTop: insets.top, flex: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}>
          <View style={[styles.topBar, { paddingHorizontal: 0, flexDirection: rtl ? "row-reverse" : "row" }]}>
            <PressableScale onPress={() => navigation.goBack()} accessibilityRole="button" hitSlop={10} style={styles.topIcon}>
              <Ionicons name={rtl ? "chevron-forward" : "chevron-back"} size={22} color={colors.text} />
            </PressableScale>
            <View style={{ flex: 1 }} />
            <PressableScale onPress={() => navigation.goBack()} accessibilityRole="button" hitSlop={10} style={styles.topIcon}>
              <Ionicons name="close" size={24} color={colors.text} />
            </PressableScale>
          </View>

          <View style={{ marginTop: spacing.lg }}>
            <Text style={[styles.h1, { color: colors.text, textAlign: rtl ? "right" : "left" }]}>
              {isApproved ? t("driverRegCompletedApproved") : isRejected ? t("driverRegRejectedTitle") : t("driverRegPendingTitle")}
            </Text>
            <Text style={[styles.sub, { color: colors.textMuted, textAlign: rtl ? "right" : "left", marginTop: spacing.sm }]}>
              {isApproved ? t("driverMyCarsApprovedHint") : isRejected ? t("driverRegRejectedBody") : t("driverRegPendingBody")}
            </Text>

            {isRejected ? (
              <View
                style={{
                  marginTop: spacing.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  borderRadius: radius.md,
                  padding: spacing.md,
                }}
              >
                <Text style={{ color: colors.textMuted, fontWeight: "800", textAlign: rtl ? "right" : "left" }}>
                  {t("driverRegReviewNote")}
                </Text>
                <Text style={{ color: colors.text, marginTop: 6, textAlign: rtl ? "right" : "left" }}>
                  {reviewNote || "—"}
                </Text>
              </View>
            ) : null}

            <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
              <CustomButton title={t("driverRegGoToMyCars")} onPress={() => navigation.navigate("DriverCars")} />
              {!isApproved ? (
                <CustomButton
                  title={t("driverRegEditSubmission")}
                  variant="outline"
                  onPress={() => setForceEdit(true)}
                />
              ) : null}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 6 : 0}
    >
      <View style={{ paddingTop: insets.top, flex: 1 }}>
        <View style={[styles.topBar, { paddingHorizontal: spacing.lg, flexDirection: rtl ? "row-reverse" : "row" }]}>
          <PressableScale onPress={onBack} accessibilityRole="button" hitSlop={10} style={styles.topIcon}>
            <Ionicons name={rtl ? "chevron-forward" : "chevron-back"} size={22} color={colors.text} />
          </PressableScale>
          <View style={{ flex: 1 }} />
          <PressableScale
            onPress={() => navigation.navigate("HelpCenter")}
            accessibilityRole="button"
            hitSlop={10}
            style={styles.topHelp}
          >
            <Text style={{ color: colors.primary, fontWeight: "800" }}>{t("driverOnboardingHelp")}</Text>
          </PressableScale>
          <PressableScale onPress={() => navigation.goBack()} accessibilityRole="button" hitSlop={10} style={styles.topIcon}>
            <Ionicons name="close" size={24} color={colors.text} />
          </PressableScale>
        </View>

        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.sm }}>
          <Text style={{ color: colors.textMuted, fontWeight: "700", textAlign: rtl ? "right" : "left" }}>
            {t("driverOnboardingProgress", { step, total: TOTAL })}
          </Text>
          <View style={[styles.progressTrack, { backgroundColor: colors.border, marginTop: spacing.xs }]}>
            <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: colors.primary }]} />
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl }}
        >
          <Animated.View key={step} entering={entering} exiting={exiting} style={{ gap: spacing.sm }}>
            {step === 1 ? (
              <>
                <Animated.View entering={FadeInUp.duration(240)}>
                  <Text style={[styles.h1, { color: colors.text, textAlign: rtl ? "right" : "left" }]}>{t("driverRegStep1Title")}</Text>
                  <Text style={[styles.sub, { color: colors.textMuted, textAlign: rtl ? "right" : "left" }]}>{t("driverRegStep1Sub")}</Text>
                </Animated.View>
                <SectionSurface noEntering style={{ padding: spacing.lg }}>
                  <UploadCard
                    title={t("driverRegProfilePic")}
                    subtitle={t("driverRegUploadRequired")}
                    uri={profileImageUrl}
                    busy={busyUploadKey === "profile"}
                    onPress={() => pickAndUpload(setProfileImageUrl, "profile", [4, 4])}
                  />
                  <View style={{ height: spacing.md }} />
                  <InputField label={t("driverRegFullName")} value={fullName} onChangeText={setFullName} />
                  <InputField label={t("driverRegPhone")} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                  <InputField
                    label={t("driverRegEmail")}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={false}
                  />
                </SectionSurface>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <Text style={[styles.h1, { color: colors.text, textAlign: rtl ? "right" : "left" }]}>{t("driverRegStep2Title")}</Text>
                <Text style={[styles.sub, { color: colors.textMuted, textAlign: rtl ? "right" : "left" }]}>{t("driverRegStep2Sub")}</Text>
                <View style={{ flexDirection: rtl ? "row-reverse" : "row", gap: spacing.sm }}>
                  <UploadCard
                    title={t("driverRegCriminalFront")}
                    subtitle={t("driverRegUploadRequired")}
                    uri={criminalFrontUrl}
                    busy={busyUploadKey === "crimFront"}
                    onPress={() => pickAndUpload(setCriminalFrontUrl, "crimFront", [4, 3])}
                  />
                  <UploadCard
                    title={t("driverRegCriminalBack")}
                    subtitle={t("driverRegUploadRequired")}
                    uri={criminalBackUrl}
                    busy={busyUploadKey === "crimBack"}
                    onPress={() => pickAndUpload(setCriminalBackUrl, "crimBack", [4, 3])}
                  />
                </View>
                <SectionSurface noEntering style={{ padding: spacing.lg }}>
                  <InputField
                    label={t("driverRegNationalId")}
                    value={nationalIdNumber}
                    onChangeText={setNationalIdNumber}
                    keyboardType="number-pad"
                    placeholder={t("driverRegNationalIdPh")}
                  />
                </SectionSurface>
              </>
            ) : null}

            {step === 3 ? (
              <>
                <Text style={[styles.h1, { color: colors.text, textAlign: rtl ? "right" : "left" }]}>{t("driverRegStep3Title")}</Text>
                <Text style={[styles.sub, { color: colors.textMuted, textAlign: rtl ? "right" : "left" }]}>{t("driverRegStep3Sub")}</Text>
                <UploadCard
                  title={t("driverRegLicenseImage")}
                  subtitle={t("driverRegUploadRequired")}
                  uri={licenseImageUrl}
                  busy={busyUploadKey === "licenseImg"}
                  onPress={() => pickAndUpload(setLicenseImageUrl, "licenseImg", [4, 3])}
                />
                <SectionSurface noEntering style={{ padding: spacing.lg }}>
                  <InputField label={t("driverRegLicenseNumber")} value={licenseNumber} onChangeText={setLicenseNumber} />
                  <InputField
                    label={t("driverRegLicenseExpiry")}
                    value={licenseExpiry}
                    onChangeText={setLicenseExpiry}
                    placeholder="YYYY-MM-DD"
                    autoCapitalize="none"
                  />
                </SectionSurface>
              </>
            ) : null}

            {step === 4 ? (
              <>
                <Text style={[styles.h1, { color: colors.text, textAlign: rtl ? "right" : "left" }]}>{t("driverRegStep4Title")}</Text>
                <Text style={[styles.sub, { color: colors.textMuted, textAlign: rtl ? "right" : "left" }]}>{t("driverRegStep4Sub")}</Text>
                <SectionSurface noEntering style={{ padding: spacing.lg }}>
                  <Text style={{ color: colors.text, fontWeight: "900", marginBottom: spacing.sm }}>
                    {t("driverRegYourCars")}
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: spacing.sm, paddingVertical: 4 }}
                  >
                    {(Array.isArray(cars) ? cars : []).map((c, idx) => {
                      const selected = idx === selectedCarIndex;
                      return (
                        <PressableScale
                          key={`${c?.plateNumber || "car"}-${idx}`}
                          onPress={() => setSelectedCarIndex(idx)}
                          style={{
                            width: 240,
                            borderRadius: radius.lg,
                            borderWidth: 1,
                            borderColor: selected ? colors.primary : colors.border,
                            backgroundColor: colors.surface,
                            padding: spacing.md,
                            shadowColor: "#000",
                            shadowOpacity: 0.08,
                            shadowRadius: 10,
                            shadowOffset: { width: 0, height: 4 },
                            elevation: 3,
                          }}
                        >
                          <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: spacing.sm }}>
                            <View
                              style={{
                                width: 56,
                                height: 44,
                                borderRadius: 12,
                                overflow: "hidden",
                                backgroundColor: colors.border,
                              }}
                            >
                              {c?.imageUrl ? (
                                <Animated.Image
                                  entering={FadeIn.duration(220)}
                                  source={{ uri: c.imageUrl }}
                                  style={{ width: "100%", height: "100%" }}
                                  resizeMode="cover"
                                />
                              ) : null}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text numberOfLines={1} style={{ color: colors.text, fontWeight: "900" }}>
                                {`${c?.brand || ""} ${c?.model || ""}`.trim()}
                              </Text>
                              <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 8, marginTop: 6 }}>
                                <View
                                  style={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: 999,
                                    backgroundColor: String(c?.color || "").trim() ? String(c.color).trim() : colors.textMuted,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                  }}
                                />
                                <Text style={{ color: colors.textMuted, fontWeight: "700" }}>
                                  {c?.color || t("driverRegColorUnknown")}
                                </Text>
                                <Text style={{ color: colors.textMuted, fontWeight: "700" }}>
                                  · {t("seats")}: {c?.seats ?? "-"}
                                </Text>
                              </View>
                            </View>
                          </View>
                        </PressableScale>
                      );
                    })}

                    <PressableScale
                      onPress={addCarFromForm}
                      style={{
                        width: 240,
                        borderRadius: radius.lg,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.bg,
                        padding: spacing.md,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name="add" size={22} color={colors.primary} />
                      <Text style={{ color: colors.primary, fontWeight: "900", marginTop: 8 }}>
                        {t("driverRegAddCar")}
                      </Text>
                      <Text style={{ color: colors.textMuted, marginTop: 4, textAlign: "center", fontSize: 12 }}>
                        {t("driverRegAddCarHint")}
                      </Text>
                    </PressableScale>
                  </ScrollView>
                </SectionSurface>

                <UploadCard
                  title={t("driverRegCarImage")}
                  subtitle={t("driverRegUploadRequired")}
                  uri={carImageUrl}
                  busy={busyUploadKey === "carImg"}
                  onPress={() => pickAndUpload(setCarImageUrl, "carImg", [4, 3])}
                />
                <SectionSurface noEntering style={{ padding: spacing.lg }}>
                  <InputField label={t("driverRegCarBrand")} value={carBrand} onChangeText={setCarBrand} />
                  <InputField label={t("driverRegCarModel")} value={carModel} onChangeText={setCarModel} />
                  <InputField label={t("driverRegCarColor")} value={carColor} onChangeText={setCarColor} />
                  <InputField label={t("driverRegCarPlate")} value={carPlateNumber} onChangeText={setCarPlateNumber} />
                  <InputField
                    label={t("driverRegSeats")}
                    value={numberOfSeats}
                    onChangeText={setNumberOfSeats}
                    keyboardType="number-pad"
                    placeholder="2–20"
                  />
                  <View style={{ height: spacing.sm }} />
                  <CustomButton title={t("driverRegAddCar")} variant="outline" onPress={addCarFromForm} disabled={!!busyUploadKey} />
                </SectionSurface>
              </>
            ) : null}

            <FormErrorCallout message={err} />
          </Animated.View>
        </ScrollView>

        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.md, paddingTop: spacing.sm }}>
          <View style={{ flexDirection: rtl ? "row-reverse" : "row", gap: spacing.sm, alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <CustomButton
                title={step === TOTAL ? t("driverRegSubmit") : t("driverOnboardingNext")}
                variant="lime"
                onPress={onNext}
                loading={submitting}
                disabled={submitting || !!busyUploadKey}
              />
            </View>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  topBar: { alignItems: "center", justifyContent: "space-between" },
  topIcon: { paddingVertical: 8, paddingHorizontal: 10 },
  topHelp: { paddingVertical: 8, paddingHorizontal: 10 },
  progressTrack: { height: 6, borderRadius: 999, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999 },
  h1: { fontSize: 22, fontWeight: "900", letterSpacing: -0.3 },
  sub: { fontSize: 13, marginTop: 6, lineHeight: 18 },
});
