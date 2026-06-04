import { Modal, View, Text, StyleSheet, Pressable, I18nManager } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import MapView from "react-native-maps";
import { weretPassenger as W } from "../../theme/weretPassenger";
import { weretRadius } from "../../theme/weretDesignSystem";
import { mapLtrContainerStyle } from "../../utils/mapProvider";
import CustomButton from "../CustomButton";

/**
 * Full-screen map picker (Uber-style) — tap compact map on home to open.
 */
export default function PassengerMapPickerModal({
  visible,
  onClose,
  mapEditTarget,
  onChangeTarget,
  mapRef,
  mapProvider,
  initialRegion,
  onMapPress,
  showsUserLocation,
  userInterfaceStyle,
  children,
  mapLocked,
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const rtl = I18nManager.isRTL;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top, backgroundColor: W.sheet }]}>
        <View style={[styles.header, { flexDirection: rtl ? "row-reverse" : "row", borderBottomColor: W.border }]}>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t("back")}
            style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <MaterialCommunityIcons name={rtl ? "arrow-right" : "arrow-left"} size={24} color={W.ink} />
          </Pressable>
          <Text style={[styles.title, { textAlign: rtl ? "right" : "left", flex: 1 }]}>
            {mapEditTarget === "pickup" ? t("passengerMapPickerPickup") : t("passengerMapPickerDestination")}
          </Text>
        </View>

        <View style={[styles.targetRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
          <Pressable
            onPress={() => onChangeTarget("pickup")}
            disabled={mapLocked}
            style={[
              styles.targetChip,
              mapEditTarget === "pickup" && styles.targetChipOn,
              { flexDirection: rtl ? "row-reverse" : "row" },
            ]}
          >
            <View style={[styles.dot, styles.dotPickup]} />
            <Text style={[styles.targetChipText, mapEditTarget === "pickup" && styles.targetChipTextOn]}>
              {t("pickup")}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onChangeTarget("destination")}
            disabled={mapLocked}
            style={[
              styles.targetChip,
              mapEditTarget === "destination" && styles.targetChipOn,
              { flexDirection: rtl ? "row-reverse" : "row" },
            ]}
          >
            <View style={[styles.dot, styles.dotDest]} />
            <Text style={[styles.targetChipText, mapEditTarget === "destination" && styles.targetChipTextOn]}>
              {t("destination")}
            </Text>
          </Pressable>
        </View>

        <View style={[styles.mapWrap, mapLtrContainerStyle]}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            provider={mapProvider}
            initialRegion={initialRegion}
            onPress={onMapPress}
            showsUserLocation={showsUserLocation}
            showsMyLocationButton={false}
            userInterfaceStyle={userInterfaceStyle}
            pitchEnabled={false}
            rotateEnabled={false}
          >
            {children}
          </MapView>
        </View>

        <Text style={[styles.hint, { color: W.muted, textAlign: "center", paddingHorizontal: 20 }]}>
          {mapEditTarget === "pickup" ? t("passengerMapPickerHintPickup") : t("passengerMapPickerHintDestination")}
        </Text>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16), borderTopColor: W.border }]}>
          <CustomButton title={t("passengerMapPickerDone")} variant="ink" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: W.text,
  },
  targetRow: {
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  targetChip: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: weretRadius.field,
    borderWidth: 1.5,
    borderColor: W.border,
    backgroundColor: W.field,
  },
  targetChipOn: {
    borderColor: W.ink,
    backgroundColor: W.sheet,
  },
  targetChipText: {
    fontSize: 14,
    fontWeight: "700",
    color: W.muted,
  },
  targetChipTextOn: {
    color: W.text,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotPickup: { backgroundColor: "#22c55e" },
  dotDest: { backgroundColor: W.ink },
  mapWrap: {
    flex: 1,
    marginHorizontal: 0,
    overflow: "hidden",
    backgroundColor: W.field,
  },
  hint: {
    fontSize: 13,
    paddingVertical: 10,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    backgroundColor: W.sheet,
  },
});
