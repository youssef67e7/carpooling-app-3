import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  I18nManager,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Image,
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
import WeretAmbientBackground from "../components/ui/weret/WeretAmbientBackground";
import WeretScreenHeader from "../components/ui/weret/WeretScreenHeader";
import WeretStepProgress from "../components/ui/weret/WeretStepProgress";
import WeretStepHeader from "../components/ui/weret/WeretStepHeader";
import WeretUploadCard from "../components/ui/weret/WeretUploadCard";
import WeretStickyFooter from "../components/ui/weret/WeretStickyFooter";
import WeretWordmarkOnLight from "../components/auth/WeretWordmarkOnLight";
import { weretElevation, weretRadius } from "../theme/weretDesignSystem";
import { showAlert } from "../utils/showAlert";
import { api } from "../api/client";
import { toApiUploadUrl, toAbsoluteUploadUrl } from "../utils/uploadUrl";
import { formatApiError } from "../utils/apiErrors";
import { applySessionThunk, setUser } from "../store/slices/authSlice";
import { fetchDriverProfileThunk, fetchDriverStatusThunk } from "../store/slices/driverSlice";

const TOTAL = 4;
const DRAFT_KEY = "driver_application_draft_v1";

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

export default function DriverOnboardingScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { colors, spacing, radius } = useWeretScreenChrome();
  const rtl = I18nManager.isRTL;
  const { user, token } = useSelector((s) => s.auth);
  const driver = useSelector((s) => s.driver);

  function uploadImageSource(uri) {
    if (!uri) return null;
    const isPrivate = String(uri).includes("/uploads/private/");
    if (isPrivate && token) return { uri, headers: { Authorization: `Bearer ${token}` } };
    return { uri };
  }
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
      setUrl(toAbsoluteUploadUrl(rel));
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
        email: email.trim().toLowerCase(),
        profileImageUrl: toApiUploadUrl(profileImageUrl),
        criminalRecordFrontUrl: toApiUploadUrl(criminalFrontUrl),
        criminalRecordBackUrl: toApiUploadUrl(criminalBackUrl),
        nationalIdNumber: nationalIdNumber.trim(),
        licenseImageUrl: toApiUploadUrl(licenseImageUrl),
        licenseNumber: licenseNumber.trim(),
        licenseExpiry: exp.toISOString().slice(0, 10),
        cars: (Array.isArray(cars) ? cars : []).map((c) => ({
          imageUrl: toApiUploadUrl(c.imageUrl),
          brand: String(c.brand || "").trim(),
          model: String(c.model || "").trim(),
          color: String(c.color || "").trim(),
          plateNumber: String(c.plateNumber || "").trim(),
          seats: Math.min(20, Math.max(2, Math.floor(Number(c.seats) || 4))),
          carCategory: ["sedan", "suv", "van"].includes(String(c.carCategory || "").toLowerCase())
            ? String(c.carCategory).toLowerCase()
            : "sedan",
        })),
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
      const msg = formatApiError(e, t);
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
    const statusIcon = isApproved ? "checkmark-circle" : isRejected ? "close-circle" : "time";
    return (
      <WeretAmbientBackground>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 6 : 0}
        >
          <View style={{ paddingTop: insets.top, flex: 1, paddingHorizontal: spacing.lg }}>
            <WeretScreenHeader
              colors={colors}
              spacing={spacing}
              onBack={() => navigation.goBack()}
              onClose={() => navigation.goBack()}
            />
            <View style={{ alignItems: "center", marginBottom: spacing.md }}>
              <WeretWordmarkOnLight label={t("appName")} fontSize={28} />
            </View>
            <Animated.View entering={FadeInUp.duration(400)} style={{ flex: 1, justifyContent: "center", paddingBottom: spacing.xl }}>
              <View style={[styles.statusIconWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name={statusIcon} size={48} color={isRejected ? colors.danger : colors.text} />
              </View>
              <WeretStepHeader
                title={isApproved ? t("driverRegCompletedApproved") : isRejected ? t("driverRegRejectedTitle") : t("driverRegPendingTitle")}
                subtitle={
                  isApproved ? t("driverMyCarsApprovedHint") : isRejected ? t("driverRegRejectedBody") : t("driverRegPendingBody")
                }
                colors={colors}
                spacing={spacing}
              />
              {isRejected ? (
                <SectionSurface noEntering elevated style={{ marginTop: spacing.sm }}>
                  <Text style={{ color: colors.textMuted, fontWeight: "800", textAlign: rtl ? "right" : "left" }}>
                    {t("driverRegReviewNote")}
                  </Text>
                  <Text style={{ color: colors.text, marginTop: 8, textAlign: rtl ? "right" : "left", lineHeight: 22 }}>
                    {reviewNote || "—"}
                  </Text>
                </SectionSurface>
              ) : null}
              <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
                <CustomButton title={t("driverRegGoToMyCars")} variant="ink" onPress={() => navigation.navigate("DriverCars")} />
                {!isApproved ? (
                  <CustomButton title={t("driverRegEditSubmission")} variant="outline" onPress={() => setForceEdit(true)} />
                ) : null}
              </View>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </WeretAmbientBackground>
    );
  }

  const stepMeta = [
    { title: t("driverRegStep1Title"), sub: t("driverRegStep1Sub") },
    { title: t("driverRegStep2Title"), sub: t("driverRegStep2Sub") },
    { title: t("driverRegStep3Title"), sub: t("driverRegStep3Sub") },
    { title: t("driverRegStep4Title"), sub: t("driverRegStep4Sub") },
  ][step - 1];

  return (
    <WeretAmbientBackground>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 6 : 0}
      >
        <View style={{ paddingTop: insets.top, flex: 1 }}>
          <WeretScreenHeader
            colors={colors}
            spacing={spacing}
            onBack={onBack}
            onClose={() => navigation.goBack()}
            helpLabel={t("driverOnboardingHelp")}
            onHelp={() => navigation.navigate("HelpCenter")}
          />

          <View style={{ paddingHorizontal: spacing.lg, alignItems: "center" }}>
            <WeretWordmarkOnLight label={t("appName")} fontSize={28} />
            <View style={{ height: spacing.sm, width: "100%" }} />
            <WeretStepProgress step={step} total={TOTAL} colors={colors} spacing={spacing} />
          </View>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl }}
        >
          <Animated.View key={step} entering={entering} exiting={exiting} style={{ gap: spacing.md }}>
            <WeretStepHeader
              overline={t("driverOnboardingProgress", { step, total: TOTAL })}
              title={stepMeta?.title}
              subtitle={stepMeta?.sub}
              colors={colors}
              spacing={spacing}
            />
            {step === 1 ? (
              <>
                <SectionSurface noEntering elevated style={{ padding: spacing.lg }}>
                  <WeretUploadCard
                    title={t("driverRegProfilePic")}
                    subtitle={t("driverRegUploadRequired")}
                    uri={profileImageUrl}
                    imageSource={uploadImageSource(profileImageUrl)}
                    busy={busyUploadKey === "profile"}
                    onPress={() => pickAndUpload(setProfileImageUrl, "profile", [4, 4])}
                    colors={colors}
                    spacing={spacing}
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
                <View style={{ flexDirection: rtl ? "row-reverse" : "row", gap: spacing.sm }}>
                  <WeretUploadCard
                    compact
                    title={t("driverRegCriminalFront")}
                    subtitle={t("driverRegUploadRequired")}
                    uri={criminalFrontUrl}
                    imageSource={uploadImageSource(criminalFrontUrl)}
                    busy={busyUploadKey === "crimFront"}
                    onPress={() => pickAndUpload(setCriminalFrontUrl, "crimFront", [4, 3])}
                    colors={colors}
                    spacing={spacing}
                  />
                  <WeretUploadCard
                    compact
                    title={t("driverRegCriminalBack")}
                    subtitle={t("driverRegUploadRequired")}
                    uri={criminalBackUrl}
                    imageSource={uploadImageSource(criminalBackUrl)}
                    busy={busyUploadKey === "crimBack"}
                    onPress={() => pickAndUpload(setCriminalBackUrl, "crimBack", [4, 3])}
                    colors={colors}
                    spacing={spacing}
                  />
                </View>
                <SectionSurface noEntering elevated style={{ padding: spacing.lg }}>
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
                <WeretUploadCard
                  title={t("driverRegLicenseImage")}
                  subtitle={t("driverRegUploadRequired")}
                  uri={licenseImageUrl}
                  imageSource={uploadImageSource(licenseImageUrl)}
                  busy={busyUploadKey === "licenseImg"}
                  onPress={() => pickAndUpload(setLicenseImageUrl, "licenseImg", [4, 3])}
                  colors={colors}
                  spacing={spacing}
                />
                <SectionSurface noEntering elevated style={{ padding: spacing.lg }}>
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
                <SectionSurface noEntering elevated style={{ padding: spacing.lg }}>
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
                            borderRadius: weretRadius.card,
                            borderWidth: selected ? 2.5 : 1,
                            borderColor: selected ? colors.text : colors.border,
                            backgroundColor: colors.surface,
                            padding: spacing.md,
                            ...(selected ? weretElevation.heroFloat : weretElevation.card),
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
                        borderRadius: weretRadius.card,
                        borderWidth: 1.5,
                        borderStyle: "dashed",
                        borderColor: colors.border,
                        backgroundColor: colors.surfaceMuted,
                        padding: spacing.md,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <View style={[styles.addCarCircle, { backgroundColor: colors.text }]}>
                        <Ionicons name="add" size={22} color={colors.primaryText} />
                      </View>
                      <Text style={{ color: colors.text, fontWeight: "900", marginTop: 8 }}>
                        {t("driverRegAddCar")}
                      </Text>
                      <Text style={{ color: colors.textMuted, marginTop: 4, textAlign: "center", fontSize: 12 }}>
                        {t("driverRegAddCarHint")}
                      </Text>
                    </PressableScale>
                  </ScrollView>
                </SectionSurface>

                <WeretUploadCard
                  title={t("driverRegCarImage")}
                  subtitle={t("driverRegUploadRequired")}
                  uri={carImageUrl}
                  imageSource={uploadImageSource(carImageUrl)}
                  busy={busyUploadKey === "carImg"}
                  onPress={() => pickAndUpload(setCarImageUrl, "carImg", [4, 3])}
                  colors={colors}
                  spacing={spacing}
                />
                <SectionSurface noEntering elevated style={{ padding: spacing.lg }}>
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

        <WeretStickyFooter colors={colors} spacing={spacing} bottomInset={insets.bottom}>
          <CustomButton
            title={step === TOTAL ? t("driverRegSubmit") : t("driverOnboardingNext")}
            variant="ink"
            onPress={onNext}
            loading={submitting}
            disabled={submitting || !!busyUploadKey}
          />
        </WeretStickyFooter>
        </View>
      </KeyboardAvoidingView>
    </WeretAmbientBackground>
  );
}

const styles = StyleSheet.create({
  statusIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 20,
    ...weretElevation.card,
  },
  addCarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
