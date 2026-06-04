import { View, Text, StyleSheet, I18nManager } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { weretStatus, weretRadius, weretElevation } from "../theme/weretDesignSystem";

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

const ICONS = {
  pending: "time-outline",
  accepted: "checkmark-circle-outline",
  ongoing: "navigate-outline",
  completed: "flag-outline",
};

export default function RideStatusBanner({ status, variant = "passenger" }) {
  const { t } = useTranslation();
  const rtl = I18nManager.isRTL;
  if (!status) return null;
  const map = variant === "driver" ? DRIVER_KEYS : PASSENGER_KEYS;
  const key = map[status];
  if (!key) return null;

  const tone =
    status === "pending"
      ? weretStatus.pending
      : status === "accepted"
        ? weretStatus.accepted
        : status === "ongoing"
          ? weretStatus.ongoing
          : weretStatus.completed;

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: tone.bg,
          borderColor: tone.border,
          flexDirection: rtl ? "row-reverse" : "row",
          ...weretElevation.card,
        },
      ]}
    >
      <View style={[styles.accent, { backgroundColor: tone.icon }]} />
      <View style={[styles.iconRing, { borderColor: tone.border }]}>
        <Ionicons name={ICONS[status] || "ellipse-outline"} size={26} color={tone.icon} />
      </View>
      <Text style={[styles.msg, { color: tone.text, textAlign: rtl ? "right" : "left" }]}>{t(key)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: weretRadius.card,
    borderWidth: 1.5,
    padding: 14,
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
    overflow: "hidden",
  },
  accent: {
    position: "absolute",
    start: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  iconRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  msg: { flex: 1, fontWeight: "800", fontSize: 15, lineHeight: 22, letterSpacing: -0.2 },
});
