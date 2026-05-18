import { View, Text, StyleSheet, I18nManager } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../context/ThemeProvider";
import { cardShadow } from "../theme/tokens";

export default function RideCard({ ride, compact, emphasis }) {
  const { t } = useTranslation();
  const { colors, spacing, radius, isDark } = useTheme();
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
  const shadowStyle = elevated ? cardShadow(isDark) : null;
  const bookedUnits = ride.totalSeats != null && ride.availableSeatUnits != null
    ? Math.max(0, Number(ride.totalSeats) - Number(ride.availableSeatUnits))
    : null;
  const passengerGroups = Array.isArray(ride.bookings) ? ride.bookings.length : null;

  return (
    <View
      style={[
        styles.card,
        {
          padding: compact ? spacing.sm : spacing.md,
          borderRadius: radius.md,
          backgroundColor: colors.surface,
          borderColor: elevated ? colors.primary : colors.border,
          borderWidth: elevated ? 2 : 1,
          ...(shadowStyle || {}),
        },
      ]}
    >
      <View style={[styles.row, { flexDirection: rtl ? "row-reverse" : "row" }]}>
        <Text style={[styles.status, { color: colors.text }]}>{statusLabel}</Text>
        {fare != null ? (
          <Text style={{ color: colors.primary, fontWeight: "700" }}>
            {fareLabel}: {Number(fare).toFixed(2)}
          </Text>
        ) : null}
      </View>
      <Text style={{ color: colors.textMuted, marginTop: spacing.xs, textAlign: rtl ? "right" : "left" }}>
        {vehicleLabel} · {new Date(ride.createdAt).toLocaleString()} · {subId}
      </Text>
      {ride.totalSeats != null && ride.availableSeatUnits != null ? (
        <Text style={{ color: colors.textMuted, marginTop: spacing.xs, fontSize: 12, textAlign: rtl ? "right" : "left" }}>
          {t("rideCardSeatsRemaining", {
            remaining: Number(ride.availableSeatUnits).toFixed(Number(ride.availableSeatUnits) % 1 === 0 ? 0 : 1),
            total: ride.totalSeats,
          })}
          {bookedUnits != null ? ` · ${Number(bookedUnits).toFixed(Number(bookedUnits) % 1 === 0 ? 0 : 1)}/${ride.totalSeats} booked` : ""}
          {passengerGroups != null ? ` · ${passengerGroups} group(s)` : ""}
        </Text>
      ) : null}
      {Array.isArray(ride.bookings) && ride.bookings[0] ? (
        <Text style={{ color: colors.textMuted, marginTop: 4, fontSize: 11, textAlign: rtl ? "right" : "left" }}>
          {t("bookingSeatUnitsLine", {
            units: Number(ride.bookings[0].seatsReserved).toFixed(
              Number(ride.bookings[0].seatsReserved) % 1 === 0 ? 0 : 1
            ),
          })}{" "}
          · {t(`passengerSize_${ride.bookings[0].passengerSize}`)} ×{ride.bookings[0].passengerCount}
        </Text>
      ) : null}
      {minP != null && est != null && minP > est ? (
        <Text style={{ color: colors.textMuted, marginTop: spacing.xs, fontSize: 12, textAlign: rtl ? "right" : "left" }}>
          {t("passengerMinFareShort", { amount: minP.toFixed(0) })}
        </Text>
      ) : null}
      {ride.status === "pending" && ride.driverProposal?.proposedFare != null ? (
        <Text style={{ color: colors.primary, marginTop: spacing.xs, fontSize: 12, textAlign: rtl ? "right" : "left" }}>
          {t("rideCardDriverOfferPending", { amount: Number(ride.driverProposal.proposedFare).toFixed(0) })}
        </Text>
      ) : null}
      {ride.status === "pending" && ride.driverProposal?.driverMeta?.name ? (
        <View style={{ marginTop: spacing.xs }}>
          <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: rtl ? "right" : "left" }}>
            {ride.driverProposal.driverMeta.name}
            {ride.driverProposal.driverMeta.carSpec ? ` · ${ride.driverProposal.driverMeta.carSpec}` : ""}
            {ride.driverProposal.driverMeta.carColor ? ` · ${ride.driverProposal.driverMeta.carColor}` : ""}
            {ride.driverProposal.driverMeta.availableSeats != null ? ` · ${t("seats")}: ${ride.driverProposal.driverMeta.availableSeats}` : ""}
          </Text>
        </View>
      ) : null}
      {ride.passengerRating != null ? (
        <Text style={{ color: colors.primary, marginTop: spacing.xs, textAlign: rtl ? "right" : "left" }}>
          ★ {ride.passengerRating}/5
        </Text>
      ) : null}
      {!compact ? (
        <Text style={{ color: colors.textMuted, marginTop: spacing.xs, textAlign: rtl ? "right" : "left", fontSize: 13 }}>
          {ride.pickupLocation?.lat?.toFixed(4)},{ride.pickupLocation?.lng?.toFixed(4)} →{" "}
          {ride.destinationLocation?.lat?.toFixed(4)},{ride.destinationLocation?.lng?.toFixed(4)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, marginBottom: 8 },
  row: { justifyContent: "space-between", alignItems: "center" },
  status: { fontWeight: "700", fontSize: 16, textTransform: "capitalize" },
});
