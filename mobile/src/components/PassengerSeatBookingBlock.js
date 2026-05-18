import { View, Text, Pressable, StyleSheet, I18nManager } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "../context/ThemeProvider";
import { PASSENGER_SIZES, computeSeatUnits } from "../constants/passengerSeatUnits";

const SIZE_META = {
  SMALL: { icon: "baby-face-outline", emoji: "👶" },
  MEDIUM: { icon: "human-male", emoji: "🧍" },
  LARGE: { icon: "human-male-height", emoji: "🧍‍♂️" },
  XL: { icon: "account-multiple", emoji: "🧍‍♂️🧍‍♂️" },
};

export default function PassengerSeatBookingBlock({
  passengerCount,
  onPassengerCount,
  passengerSize,
  onPassengerSize,
  vehicleCapacity,
}) {
  const { t } = useTranslation();
  const { colors, spacing, radius } = useTheme();
  const rtl = I18nManager.isRTL;
  const cap = Math.max(1, Number(vehicleCapacity) || 4);
  const units = computeSeatUnits(passengerCount, passengerSize);
  const remainingAfter = Math.round((cap - units) * 10) / 10;
  const over = units > cap;

  return (
    <View style={{ marginTop: spacing.md }}>
      <Text style={{ color: colors.text, fontWeight: "800", marginBottom: spacing.xs, textAlign: rtl ? "right" : "left" }}>
        {t("bookingSeatsTitle")}
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: spacing.sm, textAlign: rtl ? "right" : "left" }}>
        {t("bookingSeatsIntro")}
      </Text>

      <Text style={{ color: colors.text, fontWeight: "700", marginBottom: spacing.xs, textAlign: rtl ? "right" : "left" }}>
        {t("bookingPartyCount")}
      </Text>
      <View style={[styles.row, { flexDirection: rtl ? "row-reverse" : "row" }]}>
        <Pressable
          onPress={() => onPassengerCount(Math.max(1, passengerCount - 1))}
          style={[styles.stepBtn, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}
        >
          <Text style={{ color: colors.text, fontWeight: "800" }}>−</Text>
        </Pressable>
        <Text style={[styles.countTxt, { color: colors.text }]}>{passengerCount}</Text>
        <Pressable
          onPress={() => onPassengerCount(Math.min(8, passengerCount + 1))}
          style={[styles.stepBtn, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}
        >
          <Text style={{ color: colors.text, fontWeight: "800" }}>+</Text>
        </Pressable>
        <Text style={{ flex: 1, color: colors.textMuted, fontSize: 13, textAlign: rtl ? "right" : "left" }}>
          {t("bookingVehicleCapacityHint", { n: cap })}
        </Text>
      </View>

      <Text style={{ color: colors.text, fontWeight: "700", marginTop: spacing.md, marginBottom: spacing.sm, textAlign: rtl ? "right" : "left" }}>
        {t("bookingPassengerSize")}
      </Text>
      <View style={[styles.sizeGrid, { flexDirection: rtl ? "row-reverse" : "row" }]}>
        {PASSENGER_SIZES.map((sz) => {
          const sel = passengerSize === sz;
          const meta = SIZE_META[sz] || SIZE_META.MEDIUM;
          return (
            <Pressable
              key={sz}
              onPress={() => onPassengerSize(sz)}
              style={[
                styles.sizeChip,
                {
                  borderColor: sel ? colors.primary : colors.border,
                  backgroundColor: sel ? colors.primary + "22" : colors.surfaceMuted,
                },
              ]}
            >
              <Text style={{ fontSize: 18 }}>{meta.emoji}</Text>
              <MaterialCommunityIcons name={meta.icon} size={22} color={sel ? colors.primary : colors.text} />
              <Text style={{ color: sel ? colors.primary : colors.text, fontWeight: "700", fontSize: 11, marginTop: 4 }}>
                {t(`passengerSize_${sz}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.summaryBox, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}>
        <Text style={{ color: colors.text, fontWeight: "800", textAlign: rtl ? "right" : "left" }}>
          {t("bookingSeatUnitsLine", { units: units.toFixed(units % 1 === 0 ? 0 : 1) })}
        </Text>
        <Text style={{ color: colors.textMuted, marginTop: 4, fontSize: 12, textAlign: rtl ? "right" : "left" }}>
          {t("bookingSeatsRemainingPreview", { remaining: remainingAfter.toFixed(remainingAfter % 1 === 0 ? 0 : 1), total: cap })}
        </Text>
        {over ? (
          <Text style={{ color: colors.danger, marginTop: spacing.sm, fontWeight: "700", textAlign: rtl ? "right" : "left" }}>
            {t("bookingOverCapacity")}
          </Text>
        ) : remainingAfter > 0 && remainingAfter < 1 ? (
          <Text style={{ color: "#f59e0b", marginTop: spacing.sm, fontSize: 12, textAlign: rtl ? "right" : "left" }}>
            {t("bookingSeatsLowWarning")}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", gap: 12 },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  countTxt: { fontSize: 22, fontWeight: "900", minWidth: 36, textAlign: "center" },
  sizeGrid: { flexWrap: "wrap", gap: 10, justifyContent: "space-between" },
  sizeChip: {
    width: "23%",
    minWidth: 76,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  summaryBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
});
