import { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, ScrollView, StyleSheet, I18nManager, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { useWeretScreenChrome } from "../hooks/useWeretScreenChrome";
import { showAlert } from "../utils/showAlert";
import CustomButton from "../components/CustomButton";
import { addDriverCarThunk, fetchDriverProfileThunk, updateDriverCarThunk } from "../store/slices/driverSlice";

export default function DriverCarEditorScreen({ navigation, route }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { colors, spacing, radius } = useWeretScreenChrome();
  const rtl = I18nManager.isRTL;

  const mode = route.params?.mode || "add";
  const carId = route.params?.carId || null;
  const { profile, loading } = useSelector((s) => s.driver);

  const cars = useMemo(() => (Array.isArray(profile?.cars) ? profile.cars : []), [profile?.cars]);
  const existing = mode === "edit" && carId ? cars.find((c) => String(c?._id) === String(carId)) : null;

  const [imageUrl, setImageUrl] = useState(existing?.imageUrl || "");
  const [brand, setBrand] = useState(existing?.brand || "");
  const [model, setModel] = useState(existing?.model || "");
  const [color, setColor] = useState(existing?.color || "");
  const [plateNumber, setPlateNumber] = useState(existing?.plateNumber || "");
  const [seats, setSeats] = useState(existing?.seats != null ? String(existing.seats) : "4");
  const [carCategory, setCarCategory] = useState(existing?.carCategory || "sedan");

  useEffect(() => {
    if (mode === "edit" && !existing) {
      dispatch(fetchDriverProfileThunk());
    }
  }, [dispatch, existing, mode]);

  async function save() {
    const payload = {
      imageUrl: imageUrl.trim(),
      brand: brand.trim(),
      model: model.trim(),
      color: color.trim(),
      plateNumber: plateNumber.trim(),
      seats: Math.floor(Number(seats)),
      carCategory: String(carCategory || "sedan").toLowerCase(),
    };
    if (!payload.imageUrl || !payload.brand || !payload.model || !payload.color || !payload.plateNumber) {
      showAlert(t("error"), t("driverCarFormMissing"));
      return;
    }
    if (!Number.isFinite(payload.seats) || payload.seats < 2 || payload.seats > 20) {
      showAlert(t("error"), t("driverCarSeatsInvalid"));
      return;
    }
    try {
      if (mode === "edit" && carId) {
        await dispatch(updateDriverCarThunk({ carId, patch: payload })).unwrap();
      } else {
        await dispatch(addDriverCarThunk(payload)).unwrap();
      }
      showAlert(t("success"), t("driverCarSaved"));
      navigation.goBack();
    } catch (e) {
      showAlert(t("error"), String(e));
    }
  }

  const title = mode === "edit" ? t("driverEditCar") : t("driverAddCar");

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
      <Text style={{ color: colors.text, fontWeight: "900", fontSize: 20, textAlign: rtl ? "right" : "left" }}>{title}</Text>

      <View style={{ height: spacing.md }} />

      {[
        { label: t("driverCarImageUrl"), value: imageUrl, set: setImageUrl },
        { label: t("driverCarBrand"), value: brand, set: setBrand },
        { label: t("driverCarModel"), value: model, set: setModel },
        { label: t("driverCarColor"), value: color, set: setColor },
        { label: t("driverCarPlate"), value: plateNumber, set: setPlateNumber },
        { label: t("driverCarSeats"), value: seats, set: setSeats, keyboardType: "number-pad" },
      ].map((f) => (
        <View key={f.label} style={{ marginBottom: spacing.sm }}>
          <Text style={{ color: colors.textMuted, fontWeight: "800", marginBottom: 6, textAlign: rtl ? "right" : "left" }}>{f.label}</Text>
          <TextInput
            value={f.value}
            onChangeText={f.set}
            keyboardType={f.keyboardType}
            placeholderTextColor={colors.textMuted}
            style={[
              styles.input,
              {
                borderColor: colors.border,
                backgroundColor: colors.surface,
                borderRadius: radius.md,
                color: colors.text,
                textAlign: rtl ? "right" : "left",
              },
            ]}
          />
        </View>
      ))}

      <View style={{ marginTop: spacing.xs, marginBottom: spacing.md }}>
        <Text style={{ color: colors.textMuted, fontWeight: "800", marginBottom: 6, textAlign: rtl ? "right" : "left" }}>
          {t("driverCarCategory")}
        </Text>
        <View style={{ flexDirection: rtl ? "row-reverse" : "row", gap: spacing.sm }}>
          {["sedan", "suv", "van"].map((k) => {
            const active = carCategory === k;
            return (
              <Pressable
                key={k}
                onPress={() => setCarCategory(k)}
                style={({ pressed }) => [
                  styles.chip,
                  {
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? colors.primary : colors.surface,
                    opacity: pressed ? 0.88 : 1,
                  },
                ]}
              >
                <Text style={{ color: active ? colors.primaryText : colors.text, fontWeight: "800" }}>
                  {t(`driverCarCategory_${k}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <CustomButton title={t("save")} onPress={save} loading={loading} disabled={loading} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, paddingVertical: 10, paddingHorizontal: 12 },
  chip: { borderWidth: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, flex: 1, alignItems: "center" },
});

