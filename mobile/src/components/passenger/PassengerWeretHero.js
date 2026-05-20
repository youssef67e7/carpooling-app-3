import { View, Text, StyleSheet, ScrollView, I18nManager, Pressable, Image } from "react-native";
import Animated from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { weretPassenger as W } from "../../theme/weretPassenger";
import { weretElevation, weretPress, weretRadius } from "../../theme/weretDesignSystem";
import { weretEnter } from "../../theme/weretMotion";
import { getWeretGalleryImageForTypeKey, isMotorcycleServiceType } from "../../utils/weretServiceTypeGallery";
import WeretWordmarkOnLight from "../auth/WeretWordmarkOnLight";

export default function PassengerWeretHero({
  appName,
  nearbyCount,
  vehicleList = [],
  selectedVehicleType,
  onSelectVehicleType,
}) {
  const { t } = useTranslation();
  const rtl = I18nManager.isRTL;

  return (
    <Animated.View entering={weretEnter.screen} style={styles.wrap}>
      <Animated.View entering={weretEnter.brand} style={{ alignItems: rtl ? "flex-end" : "flex-start" }}>
        <WeretWordmarkOnLight label={appName} fontSize={30} />
      </Animated.View>
      <Animated.View entering={weretEnter.block}>
        <Text style={[styles.headline, { textAlign: rtl ? "right" : "left" }]}>{t("passengerWeretHeadline")}</Text>
        <Text style={[styles.sub, { textAlign: rtl ? "right" : "left" }]}>{t("passengerWeretSub")}</Text>
      </Animated.View>

      {nearbyCount > 0 ? (
        <Animated.View entering={weretEnter.row} style={[styles.pill, { alignSelf: rtl ? "flex-end" : "flex-start" }]}>
          <View style={styles.pillDot} />
          <Text style={styles.pillText}>{t("passengerDriversNearbyPill", { count: nearbyCount })}</Text>
        </Animated.View>
      ) : null}

      {vehicleList.length > 0 ? (
        <>
          <Animated.View entering={weretEnter.row}>
            <Text style={[styles.galleryTitle, { textAlign: rtl ? "right" : "left" }]}>{t("passengerCarGalleryTitle")}</Text>
          </Animated.View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled
            contentContainerStyle={[styles.galleryRow, { flexDirection: rtl ? "row-reverse" : "row" }]}
          >
            {vehicleList.map((v, index) => {
              const selected = selectedVehicleType === v.typeKey;
              const cap = v.capacity != null && Number(v.capacity) > 0 ? Number(v.capacity) : null;
              return (
                <Animated.View key={v.typeKey} entering={weretEnter.galleryCard(index)} style={styles.cardSlot}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => onSelectVehicleType?.(v.typeKey)}
                    style={({ pressed }) => [
                      styles.card,
                      weretElevation.card,
                      selected ? styles.cardSelected : styles.cardIdle,
                      { opacity: pressed ? weretPress.opacityStrong : 1 },
                    ]}
                  >
                    <View style={styles.cardImageWrap}>
                      <Image
                        source={getWeretGalleryImageForTypeKey(v.typeKey)}
                        style={styles.cardImage}
                        resizeMode="cover"
                        accessibilityIgnoresInvertColors
                      />
                      {isMotorcycleServiceType(v.typeKey) ? (
                        <View style={styles.motoBadge} pointerEvents="none">
                          <MaterialCommunityIcons name="motorbike" size={36} color={W.onPrimary} />
                        </View>
                      ) : null}
                    </View>
                    <Text style={[styles.cardLabel, { textAlign: rtl ? "right" : "left" }]} numberOfLines={2}>
                      {t(`vehicleType_${v.nameKey || v.typeKey}`)}
                    </Text>
                    {cap != null ? (
                      <View style={[styles.capRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
                        <MaterialCommunityIcons name="account" size={12} color={W.muted} />
                        <Text style={styles.capText}>{cap}</Text>
                      </View>
                    ) : null}
                  </Pressable>
                </Animated.View>
              );
            })}
          </ScrollView>
        </>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 18,
  },
  cardSlot: {
    width: 132,
  },
  headline: {
    marginTop: 10,
    fontSize: 22,
    fontWeight: "800",
    color: W.text,
    letterSpacing: -0.5,
  },
  sub: {
    marginTop: 6,
    fontSize: 14,
    color: W.muted,
    lineHeight: 20,
    maxWidth: "100%",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: weretRadius.pill,
    backgroundColor: W.pillOverlay,
  },
  pillDot: {
    width: 8,
    height: 8,
    borderRadius: weretRadius.dot,
    backgroundColor: W.accent,
  },
  pillText: {
    color: W.onPrimary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  galleryTitle: {
    marginTop: 18,
    fontSize: 13,
    fontWeight: "800",
    color: W.text,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  galleryRow: {
    gap: 12,
    paddingVertical: 10,
    paddingEnd: 4,
  },
  card: {
    width: "100%",
    borderRadius: weretRadius.card,
    overflow: "hidden",
  },
  cardIdle: {
    borderWidth: 1,
    borderColor: W.border,
    backgroundColor: W.sheet,
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: W.ink,
    backgroundColor: W.surfaceMuted,
  },
  cardImageWrap: {
    width: "100%",
    height: 88,
    backgroundColor: W.field,
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  motoBadge: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: W.scrim,
  },
  cardLabel: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 4,
    fontSize: 12,
    fontWeight: "700",
    color: W.text,
    minHeight: 34,
  },
  capRow: {
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  capText: {
    fontSize: 11,
    fontWeight: "700",
    color: W.muted,
  },
});
