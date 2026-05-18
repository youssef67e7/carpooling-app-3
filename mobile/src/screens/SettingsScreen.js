import { useLayoutEffect, useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, I18nManager, ScrollView, Linking } from "react-native";
import { showAlert } from "../utils/showAlert";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { setThemeModeThunk } from "../store/slices/uiSlice";
import { updateProfileThunk, clearError } from "../store/slices/authSlice";
import { setAppLanguage } from "../i18n";
import { useTheme } from "../context/ThemeProvider";
import CustomButton from "../components/CustomButton";
import InputField from "../components/InputField";
import SectionSurface from "../components/ui/SectionSurface";
import { DRIVER_VEHICLE_TYPES } from "../constants/vehicleTypes";
import { adminWebURL, apiBaseURL } from "../api/client";

export default function SettingsScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const themeMode = useSelector((s) => s.ui.themeMode);
  const { user } = useSelector((s) => s.auth);
  const { colors, spacing, radius } = useTheme();
  const rtl = I18nManager.isRTL;
  const [phone, setPhone] = useState(user?.phone || "");
  const [savingPhone, setSavingPhone] = useState(false);
  const [savingVehicle, setSavingVehicle] = useState(false);

  useEffect(() => {
    setPhone(user?.phone || "");
  }, [user?.phone]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: t("settings") });
  }, [navigation, t]);

  async function switchLang(lng) {
    await setAppLanguage(lng);
    await i18n.changeLanguage(lng);
  }

  async function savePhone() {
    dispatch(clearError());
    setSavingPhone(true);
    try {
      await dispatch(updateProfileThunk({ phone: phone.trim() })).unwrap();
      showAlert(t("success"), t("phoneSaved"));
    } catch (e) {
      showAlert(t("error"), String(e));
    } finally {
      setSavingPhone(false);
    }
  }

  async function saveDriverVehicle(vehicleType) {
    if ((user?.active_role || user?.role) !== "driver") return;
    dispatch(clearError());
    setSavingVehicle(true);
    try {
      await dispatch(updateProfileThunk({ vehicleType })).unwrap();
      showAlert(t("success"), t("vehicleClassSaved"));
    } catch (e) {
      showAlert(t("error"), String(e));
    } finally {
      setSavingVehicle(false);
    }
  }

  return (
    <ScrollView style={[styles.root, { backgroundColor: colors.bg }]} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
      <Text style={[styles.title, { color: colors.text, textAlign: rtl ? "right" : "left" }]}>{t("settings")}</Text>

      {user?.role === "admin" ? (
        <>
          <Text style={[styles.section, { color: colors.textMuted, marginTop: spacing.sm, textAlign: rtl ? "right" : "left" }]}>
            {t("adminWebPanel")}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: spacing.sm, textAlign: rtl ? "right" : "left" }}>
            {t("adminWebPanelHint")}
          </Text>
          <CustomButton
            title={t("openAdminWeb")}
            onPress={() => {
              const openUrl = `${adminWebURL}?api=${encodeURIComponent(apiBaseURL)}`;
              Linking.openURL(openUrl).catch(() => showAlert(t("error"), adminWebURL));
            }}
          />
          <Text
            selectable
            style={{ color: colors.textMuted, fontSize: 12, marginTop: spacing.sm, textAlign: rtl ? "right" : "left" }}
          >
            {adminWebURL}
          </Text>
        </>
      ) : null}

      {(user?.role === "admin" ? false : true) ? (
        <SectionSurface style={{ marginTop: spacing.sm }}>
          <Text style={[styles.section, { color: colors.textMuted, marginBottom: spacing.sm, textAlign: rtl ? "right" : "left" }]}>
            {t("phoneForCalls")}
          </Text>
          <InputField
            label={t("phoneOptional")}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder={t("phonePlaceholder")}
          />
          <CustomButton title={t("savePhone")} onPress={savePhone} loading={savingPhone} disabled={savingPhone} />
        </SectionSurface>
      ) : null}

      {(user?.active_role || user?.role) === "driver" ? (
        <SectionSurface style={{ marginTop: spacing.lg }} noEntering>
          <Text style={[styles.section, { color: colors.textMuted, marginBottom: spacing.xs, textAlign: rtl ? "right" : "left" }]}>
            {t("driverVehicleClass")}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: spacing.sm, textAlign: rtl ? "right" : "left" }}>
            {t("driverVehicleClassHint")}
          </Text>
          <View style={[styles.row, { flexDirection: rtl ? "row-reverse" : "row" }]}>
            {DRIVER_VEHICLE_TYPES.map((vt) => (
              <Pressable
                key={vt}
                onPress={() => saveDriverVehicle(vt)}
                disabled={savingVehicle}
                style={[
                  styles.chip,
                  {
                    borderColor: (user?.vehicleType || "delivery") === vt ? colors.primary : colors.border,
                    backgroundColor: (user?.vehicleType || "delivery") === vt ? colors.surfaceMuted : colors.surface,
                  },
                ]}
              >
                <Text style={{ color: colors.text, fontWeight: (user?.vehicleType || "delivery") === vt ? "800" : "500" }}>
                  {t(`vehicleType_${vt}`)}
                </Text>
              </Pressable>
            ))}
          </View>
        </SectionSurface>
      ) : null}

      <SectionSurface style={{ marginTop: spacing.md }} noEntering>
        <Text style={[styles.section, { color: colors.textMuted, marginBottom: spacing.sm, textAlign: rtl ? "right" : "left" }]}>
          {t("language")}
        </Text>
        <View style={[styles.row, { flexDirection: rtl ? "row-reverse" : "row" }]}>
          <Pressable
            style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={() => switchLang("en")}
          >
            <Text style={{ color: colors.text }}>{t("english")}</Text>
          </Pressable>
          <Pressable
            style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={() => switchLang("ar")}
          >
            <Text style={{ color: colors.text }}>{t("arabic")}</Text>
          </Pressable>
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: spacing.sm, textAlign: rtl ? "right" : "left" }}>
          {t("rtlHint")}
        </Text>
      </SectionSurface>

      <SectionSurface style={{ marginTop: spacing.md }}>
        <Text style={[styles.section, { color: colors.textMuted, marginBottom: spacing.sm, textAlign: rtl ? "right" : "left" }]}>
          {t("theme")}
        </Text>
        <View style={{ gap: spacing.sm }}>
          {["system", "light", "dark"].map((m) => (
            <Pressable
              key={m}
              onPress={() => dispatch(setThemeModeThunk(m))}
              style={[
                styles.option,
                {
                  borderColor: themeMode === m ? colors.primary : colors.border,
                  backgroundColor: colors.surface,
                  borderRadius: radius.md,
                },
              ]}
            >
              <Text style={{ color: colors.text, fontWeight: themeMode === m ? "700" : "500", textAlign: rtl ? "right" : "left" }}>
                {m === "system" ? t("themeSystem") : m === "light" ? t("themeLight") : t("themeDark")}
              </Text>
            </Pressable>
          ))}
        </View>
      </SectionSurface>

      <View style={{ marginTop: spacing.xl }}>
        <CustomButton title={t("back")} variant="outline" onPress={() => navigation.goBack()} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  title: { fontSize: 22, fontWeight: "800", marginBottom: 8 },
  section: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, borderWidth: 1 },
  option: { borderWidth: 1, padding: 12 },
});
