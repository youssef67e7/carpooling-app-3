import { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  I18nManager,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { submitReportThunk } from "../store/slices/rideSlice";
import { showAlert } from "../utils/showAlert";
import { useTheme } from "../context/ThemeProvider";
import CustomButton from "./CustomButton";

const REASON_KEYS = ["reportReason_harassment", "reportReason_fraud", "reportReason_safety", "reportReason_other"];

export default function ReportUserModal({ visible, onClose, reportedUserId, rideId, reportedName }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { colors, spacing, radius } = useTheme();
  const rtl = I18nManager.isRTL;
  const [reasonKey, setReasonKey] = useState(REASON_KEYS[0]);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  function reset() {
    setReasonKey(REASON_KEYS[0]);
    setDescription("");
  }

  function handleClose() {
    reset();
    onClose?.();
  }

  async function onSubmit() {
    const desc = description.trim();
    if (!reportedUserId || !desc) {
      showAlert(t("error"), t("reportDescribeRequired"));
      return;
    }
    setBusy(true);
    try {
      await dispatch(
        submitReportThunk({
          reportedUserId,
          rideId: rideId || undefined,
          reason: t(reasonKey).slice(0, 120),
          description: desc.slice(0, 2000),
        })
      ).unwrap();
      showAlert(t("success"), t("reportSubmitted"));
      handleClose();
    } catch (e) {
      showAlert(t("error"), String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderRadius: radius.lg ?? 18 }]}>
          <Text style={[styles.title, { color: colors.text, textAlign: rtl ? "right" : "left" }]}>
            {t("reportUserTitle")}
          </Text>
          {reportedName ? (
            <Text style={{ color: colors.textMuted, marginBottom: spacing.sm, textAlign: rtl ? "right" : "left" }}>
              {reportedName}
            </Text>
          ) : null}
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={{ color: colors.textMuted, marginBottom: spacing.xs, textAlign: rtl ? "right" : "left" }}>
              {t("reportReasonLabel")}
            </Text>
            <View style={[styles.chips, { flexDirection: rtl ? "row-reverse" : "row" }]}>
              {REASON_KEYS.map((k) => {
                const on = reasonKey === k;
                return (
                  <Pressable
                    key={k}
                    onPress={() => setReasonKey(k)}
                    style={[
                      styles.chip,
                      {
                        borderColor: on ? colors.primary : colors.border,
                        backgroundColor: on ? colors.surfaceMuted : colors.bg,
                      },
                    ]}
                  >
                    <Text style={{ color: on ? colors.primary : colors.text, fontWeight: "600", fontSize: 12 }}>
                      {t(k)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text
              style={{
                color: colors.textMuted,
                marginTop: spacing.md,
                marginBottom: spacing.xs,
                textAlign: rtl ? "right" : "left",
              }}
            >
              {t("reportDescriptionLabel")}
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={t("reportDescriptionPh")}
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={2000}
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.bg,
                  textAlign: rtl ? "right" : "left",
                  marginBottom: spacing.md,
                },
              ]}
            />
          </ScrollView>
          <View style={[styles.actions, { flexDirection: rtl ? "row-reverse" : "row" }]}>
            <CustomButton title={t("cancel")} variant="outline" onPress={handleClose} disabled={busy} style={{ flex: 1 }} />
            <View style={{ width: spacing.sm }} />
            <CustomButton title={t("reportSubmit")} onPress={onSubmit} loading={busy} style={{ flex: 1 }} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,23,42,0.45)" },
  sheet: {
    padding: 20,
    paddingBottom: 28,
    maxHeight: "88%",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.2)",
  },
  title: { fontSize: 18, fontWeight: "800", marginBottom: 4 },
  chips: { flexWrap: "wrap", gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1 },
  input: {
    minHeight: 100,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  actions: { marginTop: 16, alignItems: "center" },
});
