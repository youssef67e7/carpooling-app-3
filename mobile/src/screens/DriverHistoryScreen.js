import { useEffect, useState, useCallback, useLayoutEffect, useRef, useMemo } from "react";
import {
  View,
  SectionList,
  Pressable,
  Text,
  useWindowDimensions,
  I18nManager,
  StyleSheet,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { useIsFocused } from "@react-navigation/native";
import { fetchHistory } from "../store/slices/rideSlice";
import { useWeretScreenChrome } from "../hooks/useWeretScreenChrome";
import { weretPassenger as W } from "../theme/weretPassenger";
import { weretRadius, weretPalette } from "../theme/weretDesignSystem";
import RideCard from "../components/RideCard";
import EmptyState from "../components/EmptyState";
import { routePathToCoords } from "../utils/mapCoords";
import { getAndroidMapProvider, mapLtrContainerStyle } from "../utils/mapProvider";

const ACTIVE_STATUSES = ["pending", "accepted", "ongoing"];

function partitionRides(list) {
  const raw = list || [];
  const active = raw
    .filter((r) => ACTIVE_STATUSES.includes(r.status))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const past = raw
    .filter((r) => r.status === "completed")
    .sort((a, b) => new Date(b.completedAt || b.createdAt || 0) - new Date(a.completedAt || a.createdAt || 0));
  return { active, past };
}

export default function DriverHistoryScreen({ navigation }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { history } = useSelector((s) => s.ride);
  const { colors, spacing } = useWeretScreenChrome();
  const rtl = I18nManager.isRTL;
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const mapRef = useRef(null);
  const { height: windowHeight } = useWindowDimensions();
  const mapHeight = Math.round(windowHeight * 0.3);
  const isFocused = useIsFocused();

  const { active, past } = useMemo(() => partitionRides(history), [history]);

  const selectedRide = useMemo(() => {
    if (!selectedId) return null;
    return [...active, ...past].find((r) => String(r._id) === String(selectedId)) || null;
  }, [selectedId, active, past]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: t("history") });
  }, [navigation, t]);

  const load = useCallback(async () => {
    await dispatch(fetchHistory());
  }, [dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (isFocused) load();
  }, [isFocused, load]);

  useEffect(() => {
    if (selectedId) return;
    if (active.length > 0) setSelectedId(active[0]._id);
    else if (past.length > 0) setSelectedId(past[0]._id);
  }, [active, past, selectedId]);

  useEffect(() => {
    if (!selectedRide || !mapRef.current) return;
    const fromPath = routePathToCoords(selectedRide.routePath);
    const pickup = selectedRide.pickupLocation
      ? { latitude: selectedRide.pickupLocation.lat, longitude: selectedRide.pickupLocation.lng }
      : null;
    const dest = selectedRide.destinationLocation
      ? { latitude: selectedRide.destinationLocation.lat, longitude: selectedRide.destinationLocation.lng }
      : null;
    const coords = fromPath.length > 1 ? fromPath : pickup && dest ? [pickup, dest] : pickup ? [pickup] : [];
    if (coords.length === 0) return;
    setTimeout(() => {
      mapRef.current?.fitToCoordinates(coords, { edgePadding: { top: 50, right: 40, bottom: 30, left: 40 }, animated: true });
    }, 200);
  }, [selectedRide]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const mapProvider = getAndroidMapProvider();
  const lineCoords = selectedRide ? routePathToCoords(selectedRide.routePath) : [];
  const pickupCoord = selectedRide?.pickupLocation
    ? { latitude: selectedRide.pickupLocation.lat, longitude: selectedRide.pickupLocation.lng }
    : null;
  const destCoord = selectedRide?.destinationLocation
    ? { latitude: selectedRide.destinationLocation.lat, longitude: selectedRide.destinationLocation.lng }
    : null;

  const initialRegion = {
    latitude: pickupCoord?.latitude ?? 24.7136,
    longitude: pickupCoord?.longitude ?? 46.6753,
    latitudeDelta: 0.12,
    longitudeDelta: 0.12,
  };

  const sections = useMemo(() => {
    const out = [];
    if (active.length) out.push({ title: t("tripsSectionActive"), data: active });
    if (past.length) out.push({ title: t("tripsSectionPast"), data: past });
    return out;
  }, [active, past, t]);

  const renderItem = ({ item }) => {
    const sel = String(item._id) === String(selectedId);
    return (
      <Pressable
        onPress={() => setSelectedId(item._id)}
        style={[
          { marginBottom: spacing.sm },
          sel && { borderWidth: 2, borderColor: colors.text, borderRadius: weretRadius.card, padding: 2 },
        ]}
      >
        <RideCard ride={item} />
      </Pressable>
    );
  };

  const renderSectionHeader = ({ section: { title } }) => (
    <Text
      style={{
        color: W.text,
        fontWeight: "800",
        fontSize: 16,
        marginBottom: spacing.sm,
        marginTop: spacing.sm,
        textAlign: rtl ? "right" : "left",
      }}
    >
      {title}
    </Text>
  );

  const listEmpty = !history?.length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View
        style={[
          styles.mapShell,
          mapLtrContainerStyle,
          { height: mapHeight, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: W.border },
        ]}
      >
        <MapView ref={mapRef} style={StyleSheet.absoluteFill} provider={mapProvider} initialRegion={initialRegion}>
          {lineCoords.length > 1 ? (
            <Polyline coordinates={lineCoords} strokeColor={W.accent} strokeWidth={4} />
          ) : pickupCoord && destCoord ? (
            <Polyline coordinates={[pickupCoord, destCoord]} strokeColor={W.accent} strokeWidth={4} />
          ) : null}
          {pickupCoord ? <Marker coordinate={pickupCoord} title={t("pickup")} /> : null}
          {destCoord ? <Marker coordinate={destCoord} title={t("destination")} pinColor={weretPalette.danger} /> : null}
        </MapView>
        {!selectedRide ? (
          <View style={[styles.mapBanner, { backgroundColor: weretPalette.overlayLight }]}>
            <Text style={{ color: W.muted, fontSize: 12, textAlign: "center" }}>{t("tripsMapHint")}</Text>
          </View>
        ) : null}
      </View>

      {listEmpty ? (
        <View style={{ flex: 1, justifyContent: "center", padding: spacing.md }}>
          <EmptyState title={t("noRides")} subtitle={t("pullToRefresh")} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl, flexGrow: 1 }}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            sections.length === 0 ? <EmptyState title={t("noRides")} subtitle={t("pullToRefresh")} /> : null
          }
          stickySectionHeadersEnabled={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mapShell: { width: "100%", position: "relative", overflow: "hidden" },
  mapBanner: { position: "absolute", bottom: 8, left: 12, right: 12, padding: 8, borderRadius: 8 },
});
