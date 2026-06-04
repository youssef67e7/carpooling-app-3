import { useLayoutEffect, useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, I18nManager, Linking } from "react-native";
import { showAlert } from "../utils/showAlert";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { setThemeModeThunk } from "../store/slices/uiSlice";
import { updateProfileThunk, clearError } from "../store/slices/authSlice";
import { setAppLanguage } from "../i18n";
import { useWeretScreenChrome } from "../hooks/useWeretScreenChrome";
import CustomButton from "../components/CustomButton";
import WeretTextField from "../components/auth/WeretTextField";
import WeretListScreen from "../components/ui/weret/WeretListScreen";
import WeretStepHeader from "../components/ui/weret/WeretStepHeader";
import SectionSurface from "../components/ui/SectionSurface";
import { DRIVER_VEHICLE_TYPES } from "../constants/vehicleTypes";
import { adminWebURL, apiBaseURL } from "../api/client";
import { weretRadius } from "../theme/weretDesignSystem";

function WeretChip({ label, selected, onPress, disabled, colors }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.chip,
        {
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? colors.primary : colors.surface,
          borderWidth: selected ? 2 : 1.5,
        },
      ]}
    >
      <Text style={{ color: selected ? colors.primaryText : colors.text, fontWeight: selected ? "800" : "600" }}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function SettingsScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const themeMode = useSelector((s) => s.ui.themeMode);
  const { user } = useSelector((s) => s.auth);
  const { colors, spacing, radius } = useWeretScreenChrome();
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
    <WeretListScreen contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl * 2 }}>
      <WeretStepHeader title={t("settings")} colors={colors} spacing={spacing} />

      {user?.role === "admin" ? (
        <SectionSurface style={{ marginBottom: spacing.md }}>
          <Text style={[styles.section, { color: colors.textMuted, textAlign: rtl ? "right" : "left" }]}>
            {t("adminWebPanel")}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: spacing.sm, textAlign: rtl ? "right" : "left" }}>
            {t("adminWebPanelHint")}
          </Text>
          <CustomButton
            title={t("openAdminWeb")}
            variant="ink"
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
        </SectionSurface>
      ) : null}

      {user?.role !== "admin" ? (
        <SectionSurface style={{ marginBottom: spacing.md }}>
          <Text style={[styles.section, { color: colors.textMuted, marginBottom: spacing.sm, textAlign: rtl ? "right" : "left" }]}>
            {t("phoneForCalls")}
          </Text>
          <WeretTextField
            label={t("phoneOptional")}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder={t("phonePlaceholder")}
          />
          <CustomButton title={t("savePhone")} variant="ink" onPress={savePhone} loading={savingPhone} disabled={savingPhone} />
        </SectionSurface>
      ) : null}

      {(user?.active_role || user?.role) === "driver" ? (
        <SectionSurface style={{ marginBottom: spacing.md }} noEntering>
          <Text style={[styles.section, { color: colors.textMuted, marginBottom: spacing.xs, textAlign: rtl ? "right" : "left" }]}>
            {t("driverVehicleClass")}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: spacing.sm, textAlign: rtl ? "right" : "left" }}>
            {t("driverVehicleClassHint")}
          </Text>
          <View style={[styles.row, { flexDirection: rtl ? "row-reverse" : "row" }]}>
            {DRIVER_VEHICLE_TYPES.map((vt) => (
              <WeretChip
                key={vt}
                label={t(`vehicleType_${vt}`)}
                selected={(user?.vehicleType || "delivery") === vt}
                onPress={() => saveDriverVehicle(vt)}
                disabled={savingVehicle}
                colors={colors}
              />
            ))}
          </View>
        </SectionSurface>
      ) : null}

      <SectionSurface style={{ marginBottom: spacing.md }} noEntering>
        <Text style={[styles.section, { color: colors.textMuted, marginBottom: spacing.sm, textAlign: rtl ? "right" : "left" }]}>
          {t("language")}
        </Text>
        <View style={[styles.row, { flexDirection: rtl ? "row-reverse" : "row" }]}>
          <WeretChip label={t("english")} selected={i18n.language === "en"} onPress={() => switchLang("en")} colors={colors} />
          <WeretChip label={t("arabic")} selected={i18n.language === "ar"} onPress={() => switchLang("ar")} colors={colors} />
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: spacing.sm, textAlign: rtl ? "right" : "left" }}>
          {t("rtlHint")}
        </Text>
      </SectionSurface>

      <SectionSurface style={{ marginBottom: spacing.md }}>
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
                  backgroundColor: themeMode === m ? colors.primary : colors.surface,
                  borderRadius: radius.md,
                  borderWidth: themeMode === m ? 2 : 1.5,
                },
              ]}
            >
              <Text
                style={{
                  color: themeMode === m ? colors.primaryText : colors.text,
                  fontWeight: themeMode === m ? "800" : "500",
                  textAlign: rtl ? "right" : "left",
                }}
              >
                {m === "system" ? t("themeSystem") : m === "light" ? t("themeLight") : t("themeDark")}
              </Text>
            </Pressable>
          ))}
        </View>
      </SectionSurface>

      {navigation.canGoBack() ? (
        <CustomButton title={t("back")} variant="outline" onPress={() => navigation.goBack()} />
      ) : null}
    </WeretListScreen>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 12, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 8 },
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: weretRadius.pill },
  option: { padding: 14 },
});
