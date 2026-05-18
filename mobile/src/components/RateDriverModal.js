import { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  I18nManager,
  Vibration,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { rateRideThunk, fetchHistory } from "../store/slices/rideSlice";
import { useTheme } from "../context/ThemeProvider";

export default function RateDriverModal({ visible, ride }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { colors, spacing, radius } = useTheme();
  const rtl = I18nManager.isRTL;
  const [stars, setStars] = useState(0);
  const [review, setReview] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (visible) {
      setStars(0);
      setReview("");
    }
  }, [visible, ride?._id]);

  if (!visible || !ride) return null;

  async function submit() {
    if (stars < 1 || stars > 5) return;
    setSending(true);
    try {
      await dispatch(rateRideThunk({ rideId: ride._id, rating: stars, review })).unwrap();
      Vibration.vibrate(80);
      await dispatch(fetchHistory());
      showAlert(t("thanksRatingTitle"), t("thanksRatingBody"));
    } catch (e) {
      const msg = typeof e === "string" ? e : t("rateFailed");
      showAlert(t("error"), msg);
    } finally {
      setSending(false);
    }
  }

  const driverName = ride.driverId?.name || t("driver");

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg }]}>
          <Text style={[styles.title, { color: colors.text, textAlign: rtl ? "right" : "left" }]}>{t("rateDriverTitle")}</Text>
          <Text style={{ color: colors.textMuted, marginTop: spacing.xs, textAlign: rtl ? "right" : "left" }}>{driverName}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: spacing.sm, textAlign: rtl ? "right" : "left" }}>
            {stars > 0 ? t(`rateStarLabel_${stars}`) : t("ratePickStars")}
          </Text>
          <View style={[styles.starsRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                onPress={() => setStars(n)}
                style={[styles.starBtn, { borderColor: colors.border, backgroundColor: n <= stars ? colors.primary : colors.bg }]}
              >
                <Text style={{ fontSize: 22, color: n <= stars ? "#fff" : colors.textMuted }}>★</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={review}
            onChangeText={setReview}
            placeholder={t("rateReviewPlaceholder")}
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={300}
            style={{
              marginTop: spacing.md,
              minHeight: 72,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: spacing.sm,
              color: colors.text,
              textAlign: rtl ? "right" : "left",
            }}
          />
          <Pressable
            onPress={submit}
            disabled={sending || stars < 1}
            style={[
              styles.submit,
              { backgroundColor: colors.primary, borderRadius: radius.md, marginTop: spacing.md, opacity: stars < 1 ? 0.5 : 1 },
            ]}
          >
            {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{t("submitRating")}</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 24,
  },
  card: { maxWidth: 400, alignSelf: "center", width: "100%" },
  title: { fontSize: 18, fontWeight: "800" },
  starsRow: { marginTop: 16, justifyContent: "space-between", gap: 8 },
  starBtn: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 52,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  submit: { paddingVertical: 14, alignItems: "center" },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
