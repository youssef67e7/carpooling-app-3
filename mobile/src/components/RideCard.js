import { View, Text, StyleSheet, I18nManager } from "react-native";
import { useTranslation } from "react-i18next";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useWeretScreenChrome } from "../hooks/useWeretScreenChrome";
import { weretElevation, weretRadius, weretStatus } from "../theme/weretDesignSystem";

const STATUS_TONE = {
  pending: weretStatus.pending,
  accepted: weretStatus.accepted,
  ongoing: weretStatus.ongoing,
  completed: weretStatus.completed,
  cancelled: { bg: "#fef2f2", border: "#dc2626", text: "#991b1b" },
};

export default function RideCard({ ride, compact, emphasis }) {
  const { t } = useTranslation();
  const { colors, spacing } = useWeretScreenChrome();
  const rtl = I18nManager.isRTL;

  if (!ride) return null;
  const est = ride.estimatedFare != null ? Number(ride.estimatedFare) : null;
  const minP = ride.passengerMinFare != null ? Number(ride.passengerMinFare) : null;
  const agreed = ride.agreedFare != null ? Number(ride.agreedFare) : null;
  let fare;
  if (ride.status === "completed") fare = ride.fare != null ? ride.fare : agreed ?? est;
  else if (ride.status === "accepted" || ride.status === "ongoing") fare = agreed ?? est;
  else fare = est;
  const fareLabel = ride.status === "completed" ? t("fare") : t("estimatedFare");
  const subId = ride._id ? String(ride._id).slice(-8) : "";
  const statusLabel = t(`rideStatus_${ride.status}`, { defaultValue: ride.status });
  const vtKey = ride.vehicleType || "delivery";
  const vehicleLabel = t(`vehicleType_${vtKey}`, { defaultValue: vtKey });
  const tone = STATUS_TONE[ride.status] || STATUS_TONE.pending;

  const bookedUnits =
    ride.totalSeats != null && ride.availableSeatUnits != null
      ? Math.max(0, Number(ride.totalSeats) - Number(ride.availableSeatUnits))
      : null;
  const passengerGroups = Array.isArray(ride.bookings) ? ride.bookings.length : null;

  return (
    <View
      style={[
        styles.card,
        {
          padding: compact ? spacing.sm + 2 : spacing.md,
          borderRadius: weretRadius.card,
          backgroundColor: colors.surface,
          borderColor: emphasis ? colors.text : colors.border,
          borderWidth: emphasis ? 2 : 1.5,
          ...(emphasis ? weretElevation.heroFloat : weretElevation.card),
        },
      ]}
    >
      <View style={[styles.topRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
        <View style={[styles.statusPill, { backgroundColor: tone.bg, borderColor: tone.border }]}>
          <Text style={[styles.statusText, { color: tone.text }]}>{statusLabel}</Text>
        </View>
        {fare != null ? (
          <View style={[styles.fareBox, { backgroundColor: colors.text }]}>
            <Text style={[styles.fareLabel, { color: colors.primaryText }]}>{fareLabel}</Text>
            <Text style={[styles.fareValue, { color: colors.primaryText }]}>{Number(fare).toFixed(2)}</Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.metaRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
        <MaterialCommunityIcons name="identifier" size={14} color={colors.textMuted} />
        <Text style={[styles.meta, { color: colors.textMuted, textAlign: rtl ? "right" : "left" }]}>#{subId}</Text>
        <View style={styles.metaDot} />
        <MaterialCommunityIcons name="car-side" size={14} color={colors.textMuted} />
        <Text style={[styles.meta, { color: colors.textMuted, textAlign: rtl ? "right" : "left" }]}>{vehicleLabel}</Text>
      </View>

      {bookedUnits != null ? (
        <Text style={[styles.extra, { color: colors.textMuted, textAlign: rtl ? "right" : "left" }]}>
          {t("seatsBooked")}: {bookedUnits}
          {passengerGroups != null ? ` · ${t("passengerGroups")}: ${passengerGroups}` : ""}
        </Text>
      ) : null}
      {minP != null && ride.status === "pending" ? (
        <Text style={[styles.extra, { color: colors.textMuted, textAlign: rtl ? "right" : "left" }]}>
          {t("passengerMinFareShort", { amount: minP.toFixed(0) })}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 0 },
  topRow: { justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: weretRadius.pill,
    borderWidth: 1,
  },
  statusText: { fontWeight: "800", fontSize: 12, letterSpacing: 0.2 },
  fareBox: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: weretRadius.chip,
    alignItems: "flex-end",
  },
  fareLabel: { fontSize: 10, fontWeight: "700", opacity: 0.85, textTransform: "uppercase", letterSpacing: 0.6 },
  fareValue: { fontSize: 17, fontWeight: "900", letterSpacing: -0.4, marginTop: 1 },
  metaRow: { alignItems: "center", gap: 6, marginTop: 10, flexWrap: "wrap" },
  meta: { fontSize: 12, fontWeight: "600" },
  metaDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#c4c4c4" },
  extra: { fontSize: 12, marginTop: 6, fontWeight: "500", lineHeight: 17 },
});
