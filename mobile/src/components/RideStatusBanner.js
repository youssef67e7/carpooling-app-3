import { View, Text, StyleSheet, I18nManager } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../context/ThemeProvider";

const PASSENGER_KEYS = {
  pending: "ridePhaseWaitingDriver",
  accepted: "ridePhaseDriverAccepted",
  ongoing: "ridePhaseTracking",
  completed: "ridePhaseCompleted",
};

const DRIVER_KEYS = {
  accepted: "driverPhaseGoPickup",
  ongoing: "driverPhaseTrip",
  completed: "ridePhaseCompleted",
};

export default function RideStatusBanner({ status, variant = "passenger" }) {
  const { t } = useTranslation();
  const { colors, spacing, radius } = useTheme();
  const rtl = I18nManager.isRTL;
  if (!status) return null;
  const map = variant === "driver" ? DRIVER_KEYS : PASSENGER_KEYS;
  const key = map[status];
  if (!key) return null;

  const tone =
    status === "pending"
      ? "#d97706"
      : status === "accepted"
        ? colors.primary
        : status === "ongoing"
          ? colors.success
          : colors.textMuted;

  const icon =
    status === "pending" ? "⏳" : status === "accepted" ? "✓" : status === "ongoing" ? "🚗" : "✓";

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.surface,
          borderColor: tone,
          borderRadius: radius.md,
          padding: spacing.md,
          borderWidth: 2,
        },
      ]}
    >
      <Text style={[styles.icon, { textAlign: "center" }]}>{icon}</Text>
      <Text style={{ color: colors.text, fontWeight: "800", textAlign: rtl ? "right" : "left", marginTop: spacing.xs }}>
        {t(key)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 8 },
  icon: { fontSize: 28 },
});
