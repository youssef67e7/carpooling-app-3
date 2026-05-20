import { View, Text, StyleSheet, I18nManager } from "react-native";
import { useTranslation } from "react-i18next";
import { useWeretScreenChrome } from "../hooks/useWeretScreenChrome";
import { weretElevation, weretRadius } from "../theme/weretDesignSystem";

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

  const elevated = !!emphasis;
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
          padding: compact ? spacing.sm : spacing.md,
          borderRadius: weretRadius.card,
          backgroundColor: colors.surface,
          borderColor: elevated ? colors.text : colors.border,
          borderWidth: elevated ? 2 : 1,
          ...(elevated ? weretElevation.heroFloat : weretElevation.card),
        },
      ]}
    >
      <View style={[styles.row, { flexDirection: rtl ? "row-reverse" : "row" }]}>
        <Text style={[styles.status, { color: colors.text }]}>{statusLabel}</Text>
        {fare != null ? (
          <Text style={{ color: colors.text, fontWeight: "800" }}>
            {fareLabel}: {Number(fare).toFixed(2)}
          </Text>
        ) : null}
      </View>
      <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4, textAlign: rtl ? "right" : "left" }}>
        #{subId} · {vehicleLabel}
      </Text>
      {bookedUnits != null ? (
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2, textAlign: rtl ? "right" : "left" }}>
          {t("seatsBooked")}: {bookedUnits}
          {passengerGroups != null ? ` · ${t("passengerGroups")}: ${passengerGroups}` : ""}
        </Text>
      ) : null}
      {minP != null && ride.status === "pending" ? (
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2, textAlign: rtl ? "right" : "left" }}>
          {t("passengerMinFareShort", { amount: minP.toFixed(0) })}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 0 },
  row: { justifyContent: "space-between", alignItems: "center" },
  status: { fontWeight: "800", fontSize: 14, letterSpacing: -0.2 },
});
