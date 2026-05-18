import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  I18nManager,
  RefreshControl,
  Vibration,
  TextInput,
  Modal,
} from "react-native";
import { showAlert } from "../utils/showAlert";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import MapView, { Marker, Polyline } from "react-native-maps";
import { useIsFocused } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import Animated, { FadeInUp, FadeOut, useAnimatedStyle, useSharedValue, withRepeat, withTiming, cancelAnimation } from "react-native-reanimated";
import { setUser } from "../store/slices/authSlice";
import {
  fetchAvailableRides,
  acceptRideThunk,
  startRideThunk,
  endRideThunk,
  fetchRideById,
  toggleDriverOnlineThunk,
  updateDriverLocationThunk,
  setActiveRide,
  driverConfirmBookingThunk,
} from "../store/slices/rideSlice";
import { useTheme } from "../context/ThemeProvider";
import { weretPassenger as W } from "../theme/weretPassenger";
import { weretRadius, weretElevation, weretPalette } from "../theme/weretDesignSystem";
import { usePolling } from "../hooks/usePolling";
import { routePathToCoords } from "../utils/mapCoords";
import { interpolateMapCoords } from "../utils/routePolyline";
import { getAndroidMapProvider, mapLtrContainerStyle } from "../utils/mapProvider";
import { haversineKm } from "../utils/tripFare";
import { isSocketConnected } from "../realtime/socket";
import CustomButton from "../components/CustomButton";
import RideCard from "../components/RideCard";
import EmptyState from "../components/EmptyState";
import StaggerEntrance from "../components/ui/StaggerEntrance";
import RideStatusBanner from "../components/RideStatusBanner";
import DriverDrawerMenu from "../components/DriverDrawerMenu";

const REGION = {
  latitude: 24.7136,
  longitude: 46.6753,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};

export default function DriverHomeScreen({ navigation }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { spacing } = useTheme();
  const isFocused = useIsFocused();
  const rtl = I18nManager.isRTL;

  const { user } = useSelector((s) => s.auth);
  const { availableRides, activeRide } = useSelector((s) => s.ride);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loc, setLoc] = useState(null);
  const [locationAllowed, setLocationAllowed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pickupFilter, setPickupFilter] = useState("");
  const [destFilter, setDestFilter] = useState("");
  const [offerModalRide, setOfferModalRide] = useState(null);
  const [offerFareInput, setOfferFareInput] = useState("");
  const [listStaggerNonce, setListStaggerNonce] = useState(0);
  const prevAvailCountRef = useRef(0);
  const [pulseTick, setPulseTick] = useState(0);
  const hadPendingProposalRef = useRef(false);
  const mapRef = useRef(null);
  const lastLocSentRef = useRef(null);
  const lastLocSentAtRef = useRef(0);

  const fmtLoc = useCallback((pt) => {
    if (!pt?.lat && pt?.lat !== 0) return "—";
    return `${Number(pt.lat).toFixed(3)}, ${Number(pt.lng).toFixed(3)}`;
  }, []);

  const RideRequestRow = useCallback(
    function RideRequestRow({ item, index }) {
      const pulse = pulseTick > 0 && index === 0;
      const scale = useSharedValue(1);
      useEffect(() => {
        if (!pulse) return;
        scale.value = 1;
        scale.value = withRepeat(withTiming(1.015, { duration: 520 }), 5, true);
        const timeout = setTimeout(() => {
          cancelAnimation(scale);
          scale.value = withTiming(1, { duration: 180 });
        }, 2800);
        return () => clearTimeout(timeout);
      }, [pulse, pulseTick, scale]);

      const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }), []);

      const fare = item.estimatedFare ?? item.fare;
      const minPass = item.passengerMinFare != null ? Number(item.passengerMinFare) : null;
      const vt = item.vehicleType || "delivery";

      return (
        <Animated.View
          entering={FadeInUp.duration(220).delay(Math.min(index, 10) * 35)}
          exiting={FadeOut.duration(160)}
          style={animStyle}
        >
          <View
            style={[
              styles.requestCard,
              {
                borderColor: W.border,
                backgroundColor: W.field,
                marginBottom: spacing.sm,
                borderRadius: weretRadius.card,
                ...weretElevation.card,
              },
            ]}
          >
            <View style={[styles.row, { flexDirection: rtl ? "row-reverse" : "row", borderBottomWidth: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "800", color: W.text, textAlign: rtl ? "right" : "left" }}>
                  {item.passengerId?.name || t("passenger")}
                </Text>
                <Text style={{ color: W.gold, fontSize: 13, marginTop: 4, textAlign: rtl ? "right" : "left" }}>
                  {fare != null ? `${t("suggestedFareShort")}: ${Number(fare).toFixed(0)}` : "—"}
                  {minPass != null && minPass > (Number(fare) || 0)
                    ? ` · ${t("passengerMinFareShort", { amount: minPass.toFixed(0) })}`
                    : ""}{" "}
                  · {t(`vehicleType_${vt}`)}
                </Text>
                {item.totalSeats != null && item.availableSeatUnits != null ? (
                  <Text style={{ color: W.accent, fontSize: 12, marginTop: 4, textAlign: rtl ? "right" : "left" }}>
                    {t("rideCardSeatsRemaining", {
                      remaining: Number(item.availableSeatUnits).toFixed(
                        Number(item.availableSeatUnits) % 1 === 0 ? 0 : 1
                      ),
                      total: item.totalSeats,
                    })}
                  </Text>
                ) : null}
                <Text style={{ color: W.muted, fontSize: 12, marginTop: 6, textAlign: rtl ? "right" : "left" }}>
                  A · {fmtLoc(item.pickupLocation)}
                </Text>
                <Text style={{ color: W.muted, fontSize: 12, marginTop: 2, textAlign: rtl ? "right" : "left" }}>
                  B · {fmtLoc(item.destinationLocation)}
                </Text>
              </View>
              <Pressable
                style={[
                  styles.smallBtn,
                  {
                    backgroundColor: W.ink,
                    alignSelf: "center",
                    borderRadius: weretRadius.pill,
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                  },
                ]}
                onPress={() => openOfferModal(item)}
                disabled={busy}
              >
                <Text style={[styles.smallBtnText, { color: W.onPrimary }]}>{t("driverSubmitPriceOffer")}</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      );
    },
    [busy, fmtLoc, openOfferModal, pulseTick, rtl, spacing.sm, t]
  );

  const filteredAvailableRides = useMemo(() => {
    const p = pickupFilter.trim().toLowerCase();
    const d = destFilter.trim().toLowerCase();
    if (!p && !d) return availableRides;
    return availableRides.filter((r) => {
      const name = (r.passengerId?.name || "").toLowerCase();
      const idTail = String(r._id || "").toLowerCase();
      const puStr = r.pickupLocation?.lat != null ? `${r.pickupLocation.lat},${r.pickupLocation.lng}`.toLowerCase() : "";
      const deStr =
        r.destinationLocation?.lat != null ? `${r.destinationLocation.lat},${r.destinationLocation.lng}`.toLowerCase() : "";
      const matchP = !p || name.includes(p) || idTail.includes(p) || puStr.includes(p);
      const matchD = !d || name.includes(d) || idTail.includes(d) || deStr.includes(d);
      return matchP && matchD;
    });
  }, [availableRides, pickupFilter, destFilter]);

  const myId = user?._id?.toString();
  const proposalDriverId =
    activeRide?.driverProposal?.driverId?._id?.toString() ||
    activeRide?.driverProposal?.driverId?.toString();
  const preassignedId =
    activeRide?.preassignedDriverId?._id?.toString() || activeRide?.preassignedDriverId?.toString();
  const awaitingPassengerOnProposal =
    !!activeRide && activeRide.status === "pending" && proposalDriverId === myId && !activeRide.awaitingDriverConfirm;

  /** Hide the active trip from the list only when it is clearly "tracked" here (trip live, confirm step, or offer waiting on passenger). After a rejected offer, the same ride must stay visible so the driver can send a new price. */
  const listWithoutActiveRide = useMemo(() => {
    if (!activeRide?._id) return filteredAvailableRides;
    const aid = String(activeRide._id);
    const st = activeRide.status;
    const hideDuplicate =
      st === "accepted" ||
      st === "ongoing" ||
      (st === "pending" && activeRide.awaitingDriverConfirm === true) ||
      (st === "pending" && awaitingPassengerOnProposal);
    if (!hideDuplicate) return filteredAvailableRides;
    return filteredAvailableRides.filter((r) => String(r._id) !== aid);
  }, [filteredAvailableRides, activeRide, awaitingPassengerOnProposal]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable
          onPress={() => setDrawerOpen(true)}
          style={{ paddingVertical: 8, paddingHorizontal: 10 }}
          accessibilityRole="button"
          accessibilityLabel={t("driverMenuOpen")}
        >
          <Ionicons name="menu" size={26} color={W.ink} />
        </Pressable>
      ),
    });
  }, [navigation, t]);

  const rideId = activeRide?._id;
  const rideStatus = activeRide?.status;

  const awaitingDriverConfirmBooking =
    !!activeRide && activeRide.status === "pending" && activeRide.awaitingDriverConfirm && preassignedId === myId;

  useEffect(() => {
    const r = activeRide;
    if (!r || (user?.active_role || user?.role) !== "driver" || !myId) return;
    const propId =
      r.driverProposal?.driverId?._id?.toString() || r.driverProposal?.driverId?.toString();
    if (r.status === "pending" && propId === myId) hadPendingProposalRef.current = true;
    if (
      r.status === "pending" &&
      !r.driverProposal &&
      !r.driverId &&
      !r.awaitingDriverConfirm &&
      hadPendingProposalRef.current
    ) {
      hadPendingProposalRef.current = false;
      showAlert(t("driverOfferRejectedTitle"), t("driverOfferRejectedBody"));
      dispatch(setActiveRide(null));
      dispatch(fetchAvailableRides());
    }
    if (r.status === "accepted" && r.driverId && String(r.driverId) === myId) hadPendingProposalRef.current = false;
    if (r.awaitingDriverConfirm && preassignedId === myId) hadPendingProposalRef.current = false;
  }, [activeRide, dispatch, myId, preassignedId, t, user?.active_role, user?.role]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationAllowed(status === "granted");
      if (status !== "granted") return;
      const pos = await Location.getCurrentPositionAsync({});
      const c = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setLoc(c);
      if (user?.isOnline) {
        dispatch(updateDriverLocationThunk({ lat: c.latitude, lng: c.longitude }));
      }
    })();
  }, [dispatch, user?.isOnline]);

  useEffect(() => {
    if (!loc || activeRide) return;
    mapRef.current?.animateToRegion(
      {
        ...loc,
        latitudeDelta: REGION.latitudeDelta,
        longitudeDelta: REGION.longitudeDelta,
      },
      400
    );
  }, [loc?.latitude, loc?.longitude, activeRide?._id]);

  const pollRide = useCallback(() => {
    if (rideId) dispatch(fetchRideById(rideId));
  }, [dispatch, rideId]);

  const pollAvailable = useCallback(() => {
    // If Socket.IO is connected, rely on real-time updates to reduce load.
    if (isSocketConnected()) return;
    dispatch(fetchAvailableRides());
  }, [dispatch]);

  const ridePollMs = rideId && rideStatus !== "completed" ? 2000 : 3000;
  usePolling(pollRide, ridePollMs, !!rideId && rideStatus !== "completed", isFocused);
  const pausePollAvailable =
    activeRide && ["accepted", "ongoing"].includes(activeRide.status);
  usePolling(pollAvailable, 4000, !!user?.isOnline && isFocused && !pausePollAvailable, isFocused);

  const pushLocation = useCallback(async () => {
    if (!user?.isOnline || !locationAllowed) return;
    try {
      const now = Date.now();
      // Avoid hammering GPS + API. Allow more frequent when a trip is in progress.
      const minMs = activeRide && ["accepted", "ongoing"].includes(rideStatus) ? 2500 : 5000;
      if (now - lastLocSentAtRef.current < minMs) return;

      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const c = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setLoc(c);

      // Skip update if driver didn't move enough (reduces battery + backend writes).
      const prev = lastLocSentRef.current;
      const movedKm =
        prev?.latitude != null
          ? haversineKm(prev.latitude, prev.longitude, c.latitude, c.longitude)
          : null;
      const movedEnough = movedKm == null ? true : movedKm >= 0.02; // ~20 meters
      if (!movedEnough) return;

      lastLocSentAtRef.current = now;
      lastLocSentRef.current = c;
      await dispatch(updateDriverLocationThunk({ lat: c.latitude, lng: c.longitude })).unwrap();
    } catch {
      /* ignore */
    }
  }, [dispatch, user?.isOnline, locationAllowed, activeRide, rideStatus]);

  const locPushMs =
    user?.isOnline && activeRide && ["accepted", "ongoing"].includes(rideStatus) ? 2500 : 4000;
  usePolling(pushLocation, locPushMs, !!user?.isOnline && isFocused, isFocused);

  useEffect(() => {
    if (activeRide?.status === "completed") {
      dispatch(setActiveRide(null));
    }
  }, [activeRide?.status, dispatch]);

  async function toggleOnline() {
    setBusy(true);
    try {
      const data = await dispatch(toggleDriverOnlineThunk()).unwrap();
      dispatch(setUser(data.user));
      if (data.isOnline && loc) {
        await dispatch(updateDriverLocationThunk({ lat: loc.latitude, lng: loc.longitude })).unwrap();
      }
      if (data.isOnline) dispatch(fetchAvailableRides());
    } catch (e) {
      showAlert(t("error"), String(e));
    } finally {
      setBusy(false);
    }
  }

  function openOfferModal(item) {
    const suggested = Number(item?.estimatedFare ?? 0) || 0;
    setOfferModalRide(item);
    setOfferFareInput(String(Math.round(suggested * 100) / 100));
  }

  async function submitDriverOffer() {
    if (!offerModalRide?._id) return;
    const fare = Number(String(offerFareInput).replace(",", "."));
    if (Number.isNaN(fare) || fare <= 0) {
      showAlert(t("error"), t("driverOfferInvalidFare"));
      return;
    }
    const minOffer = Math.max(
      Number(offerModalRide.estimatedFare ?? 0),
      Number(offerModalRide.passengerMinFare ?? 0)
    );
    if (fare < minOffer) {
      showAlert(t("error"), t("driverOfferBelowPassengerMin", { amount: minOffer.toFixed(0) }));
      return;
    }
    setBusy(true);
    try {
      await dispatch(acceptRideThunk({ rideId: offerModalRide._id, proposedFare: fare })).unwrap();
      setOfferModalRide(null);
      await dispatch(fetchAvailableRides());
    } catch (e) {
      showAlert(t("error"), String(e));
    } finally {
      setBusy(false);
    }
  }

  async function driverConfirmBooking(accept) {
    if (!activeRide?._id) return;
    setBusy(true);
    try {
      await dispatch(driverConfirmBookingThunk({ rideId: activeRide._id, accept })).unwrap();
      if (!accept) dispatch(setActiveRide(null));
    } catch (e) {
      showAlert(t("error"), String(e));
    } finally {
      setBusy(false);
    }
  }

  async function start() {
    if (!activeRide?._id) return;
    setBusy(true);
    try {
      await dispatch(startRideThunk(activeRide._id)).unwrap();
    } catch (e) {
      showAlert(t("error"), String(e));
    } finally {
      setBusy(false);
    }
  }

  async function end() {
    if (!activeRide?._id) return;
    setBusy(true);
    try {
      await dispatch(endRideThunk(activeRide._id)).unwrap();
      showAlert(t("completedRideTitle"), t("completedRideBody"));
    } catch (e) {
      showAlert(t("error"), String(e));
    } finally {
      setBusy(false);
    }
  }

  const pickup = useMemo(() => {
    if (!activeRide?.pickupLocation?.lat) return null;
    return { latitude: activeRide.pickupLocation.lat, longitude: activeRide.pickupLocation.lng };
  }, [activeRide]);

  const dest = useMemo(() => {
    if (!activeRide?.destinationLocation?.lat) return null;
    return { latitude: activeRide.destinationLocation.lat, longitude: activeRide.destinationLocation.lng };
  }, [activeRide]);

  /** Pickup → destination (full trip) — shown while driving the trip */
  const tripLineCoords = useMemo(() => {
    const fromRide = routePathToCoords(activeRide?.routePath);
    if (fromRide.length > 1) return fromRide;
    if (pickup && dest) return [pickup, dest];
    return [];
  }, [activeRide, pickup, dest]);

  /** Driver GPS → pickup — shown while accepted, before trip start */
  const toPickupLineCoords = useMemo(() => {
    if (rideStatus !== "accepted" || !loc || !pickup) return [];
    return interpolateMapCoords(loc, pickup, 22);
  }, [rideStatus, loc, pickup]);

  const passengerLiveCoord = useMemo(() => {
    if (!activeRide) return null;
    if (!["pending", "accepted", "ongoing"].includes(activeRide.status)) return null;
    const pl = activeRide.passengerId?.location;
    if (pl?.lat == null || pl?.lng == null) return null;
    const lat = Number(pl.lat);
    const lng = Number(pl.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    if (lat === 0 && lng === 0) return null;
    return { latitude: lat, longitude: lng };
  }, [activeRide]);

  useEffect(() => {
    if (!activeRide) return undefined;
    const pts = [];
    if (rideStatus === "accepted") {
      if (loc) pts.push({ ...loc });
      if (pickup) pts.push({ ...pickup });
      if (passengerLiveCoord) pts.push({ ...passengerLiveCoord });
    } else if (rideStatus === "ongoing") {
      tripLineCoords.forEach((c) => pts.push({ ...c }));
      if (dest) pts.push({ ...dest });
      if (loc) pts.push({ ...loc });
    } else {
      if (pickup) pts.push({ ...pickup });
      if (dest) pts.push({ ...dest });
      if (passengerLiveCoord) pts.push({ ...passengerLiveCoord });
      if (loc) pts.push({ ...loc });
    }
    if (pts.length === 0) return undefined;
    const raf = requestAnimationFrame(() => {
      mapRef.current?.fitToCoordinates(pts, {
        edgePadding: { top: 64, right: 24, bottom: 300, left: 24 },
        animated: true,
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [
    activeRide?._id,
    rideStatus,
    tripLineCoords,
    pickup?.latitude,
    pickup?.longitude,
    dest?.latitude,
    dest?.longitude,
    passengerLiveCoord?.latitude,
    passengerLiveCoord?.longitude,
    loc?.latitude,
    loc?.longitude,
  ]);

  const mapProvider = getAndroidMapProvider();
  const showRequestPins = user?.isOnline && !activeRide && availableRides.length > 0;

  const onListRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (user?.isOnline) await dispatch(fetchAvailableRides());
      setListStaggerNonce((n) => n + 1);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, user?.isOnline]);

  // When new requests arrive (polling/socket), bump nonce to re-run entrance animations.
  useEffect(() => {
    if (!user?.isOnline || !!activeRide) return;
    const prev = prevAvailCountRef.current;
    const next = Array.isArray(listWithoutActiveRide) ? listWithoutActiveRide.length : 0;
    prevAvailCountRef.current = next;
    if (next > prev) {
      setPulseTick((x) => x + 1);
      setListStaggerNonce((n) => n + 1);
    }
  }, [user?.isOnline, activeRide?._id, listWithoutActiveRide.length]);

  return (
    <View style={[styles.root, { backgroundColor: weretPalette.surfaceMuted }]}>
      <DriverDrawerMenu visible={drawerOpen} onClose={() => setDrawerOpen(false)} navigation={navigation} />
      <View style={styles.mapArea}>
        <View style={[styles.mapShell, mapLtrContainerStyle]}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={mapProvider}
            initialRegion={REGION}
            showsUserLocation={locationAllowed}
          >
            <Fragment>
              {loc ? <Marker coordinate={loc} title={t("selfLocation")} pinColor={W.accent} /> : null}
              {pickup ? <Marker coordinate={pickup} title={t("pickup")} /> : null}
              {dest ? <Marker coordinate={dest} title={t("destination")} pinColor={weretPalette.danger} /> : null}
              {passengerLiveCoord ? (
                <Marker coordinate={passengerLiveCoord} title={t("passengerOnMap")} pinColor={W.gold} />
              ) : null}
              {rideStatus === "ongoing" && tripLineCoords.length > 1 ? (
                <Polyline coordinates={tripLineCoords} strokeColor={W.accent} strokeWidth={4} />
              ) : null}
              {rideStatus === "accepted" && tripLineCoords.length > 1 ? (
                <Polyline
                  coordinates={tripLineCoords}
                  strokeColor={W.muted}
                  strokeWidth={2}
                  lineDashPattern={[10, 6]}
                />
              ) : null}
              {rideStatus === "accepted" && toPickupLineCoords.length > 1 ? (
                <Polyline coordinates={toPickupLineCoords} strokeColor={W.gold} strokeWidth={4} />
              ) : null}
              {showRequestPins
                ? availableRides.map((r) =>
                    r.pickupLocation?.lat != null && r.pickupLocation?.lng != null ? (
                      <Marker
                        key={r._id}
                        coordinate={{ latitude: r.pickupLocation.lat, longitude: r.pickupLocation.lng }}
                        title={t("pickupRequestMarker")}
                        description={r.passengerId?.name || ""}
                        pinColor={W.gold}
                      />
                    ) : null
                  )
                : null}
            </Fragment>
          </MapView>
          {activeRide && (rideStatus === "accepted" || rideStatus === "ongoing") ? (
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                bottom: 12,
                start: 10,
                end: 10,
                backgroundColor: weretPalette.overlayLight,
                borderRadius: weretRadius.chip,
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: W.border,
              }}
            >
              <Text style={{ color: W.text, fontSize: 12, fontWeight: "700", textAlign: rtl ? "right" : "left" }}>
                {rideStatus === "accepted" ? t("mapLegendToPickupDriver") : t("mapLegendTripDriver")}
              </Text>
            </View>
          ) : null}
        </View>
        {showRequestPins ? (
          <View style={[styles.floatingBadge, { backgroundColor: W.sheet, borderColor: W.border, ...weretElevation.card }]}>
            <Text style={{ color: W.text, fontWeight: "800" }}>{availableRides.length}</Text>
            <Text style={{ color: W.muted, fontSize: 12 }}>{t("newRideRequests")}</Text>
          </View>
        ) : null}
      </View>
      <View
        style={[
          styles.panel,
          {
            backgroundColor: W.sheet,
            borderTopLeftRadius: weretRadius.card,
            borderTopRightRadius: weretRadius.card,
            padding: spacing.md,
            ...weretElevation.card,
          },
        ]}
      >
        {!locationAllowed ? (
          <Text style={{ color: weretPalette.danger, marginBottom: spacing.sm, fontSize: 13 }}>{t("locationPermission")}</Text>
        ) : null}

        <View
          style={[
            styles.hintBanner,
            {
              flexDirection: rtl ? "row-reverse" : "row",
              backgroundColor: W.field,
              borderColor: W.accent + "55",
              borderRadius: weretRadius.field,
            },
          ]}
        >
          <Ionicons name="information-circle-outline" size={18} color={W.accent} style={{ marginHorizontal: 4 }} />
          <Text style={{ flex: 1, color: W.text, fontSize: 12, textAlign: rtl ? "right" : "left" }}>{t("driverApplyHint")}</Text>
        </View>

        <View style={[styles.filterRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
          <View style={[styles.filterField, { backgroundColor: W.field, borderColor: W.border, borderRadius: weretRadius.field }]}>
            <Text style={[styles.filterBadge, { color: W.accent }]}>A</Text>
            <TextInput
              value={pickupFilter}
              onChangeText={setPickupFilter}
              placeholder={t("driverFilterPickup")}
              placeholderTextColor={W.muted}
              style={[styles.filterInput, { color: W.text, textAlign: rtl ? "right" : "left" }]}
            />
          </View>
          <View style={[styles.filterField, { backgroundColor: W.field, borderColor: W.border, borderRadius: weretRadius.field }]}>
            <Text style={[styles.filterBadge, { color: W.accent }]}>B</Text>
            <TextInput
              value={destFilter}
              onChangeText={setDestFilter}
              placeholder={t("driverFilterDestination")}
              placeholderTextColor={W.muted}
              style={[styles.filterInput, { color: W.text, textAlign: rtl ? "right" : "left" }]}
            />
          </View>
        </View>
        <View
          style={[
            styles.filterFieldWide,
            { backgroundColor: W.field, borderColor: W.border, borderRadius: weretRadius.field },
          ]}
        >
          <Ionicons name="calendar-outline" size={18} color={W.muted} style={{ marginEnd: 8 }} />
          <Text style={{ flex: 1, color: W.muted, fontSize: 14, textAlign: rtl ? "right" : "left" }}>
            {t("driverFilterWhen")}
          </Text>
        </View>

        <Pressable
          style={[
            styles.toggle,
            { borderRadius: weretRadius.pill },
            user?.isOnline ? { backgroundColor: W.accent } : { backgroundColor: W.muted },
            busy && { opacity: 0.6 },
          ]}
          onPress={toggleOnline}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color={W.onPrimary} />
          ) : (
            <Text style={styles.toggleText}>{user?.isOnline ? t("goOffline") : t("goOnline")}</Text>
          )}
        </Pressable>
        {activeRide ? (
          <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
            <RideStatusBanner status={activeRide.status} variant="driver" />
            {awaitingPassengerOnProposal ? (
              <Text style={{ color: W.muted, textAlign: rtl ? "right" : "left", marginBottom: 4 }}>
                {t("driverAwaitingPassengerOnOffer")}
              </Text>
            ) : null}
            {awaitingDriverConfirmBooking ? (
              <View style={{ marginBottom: spacing.sm, gap: spacing.sm }}>
                <Text style={{ color: W.text, fontWeight: "800", textAlign: rtl ? "right" : "left" }}>
                  {t("driverPassengerAcceptedPrice")}
                </Text>
                <Text style={{ color: W.muted, textAlign: rtl ? "right" : "left" }}>
                  {t("driverPassengerAcceptedPriceSub", {
                    amount: Number(activeRide.preassignedFare ?? 0).toFixed(0),
                  })}
                </Text>
                <View style={{ flexDirection: rtl ? "row-reverse" : "row", gap: spacing.sm }}>
                  <CustomButton
                    style={{ flex: 1 }}
                    title={t("driverDeclineTrip")}
                    variant="outline"
                    onPress={() => driverConfirmBooking(false)}
                    disabled={busy}
                  />
                  <CustomButton
                    style={{ flex: 1 }}
                    title={t("driverAcceptTrip")}
                    variant="ink"
                    onPress={() => driverConfirmBooking(true)}
                    disabled={busy}
                    loading={busy}
                  />
                </View>
              </View>
            ) : null}
            <RideCard ride={activeRide} compact />
            {activeRide.status === "accepted" ? (
              <CustomButton title={t("startTrip")} variant="ink" onPress={start} disabled={busy} loading={busy} />
            ) : null}
            {activeRide.status === "ongoing" ? (
              <CustomButton title={t("endTrip")} variant="danger" onPress={end} disabled={busy} loading={busy} />
            ) : null}
            {["accepted", "ongoing"].includes(activeRide.status) ? (
              <CustomButton
                title={t("openRideChat")}
                variant="outline"
                onPress={() => navigation.navigate("RideChat", { rideId: activeRide._id })}
              />
            ) : null}
          </View>
        ) : null}
        <Text style={{ marginTop: spacing.md, fontWeight: "700", color: W.text, textAlign: rtl ? "right" : "left" }}>
          {t("availableRides")}
        </Text>
        <FlatList
          data={listWithoutActiveRide}
          keyExtractor={(item) => `${String(item._id)}-${listStaggerNonce}`}
          style={{ maxHeight: 220, marginTop: spacing.sm }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onListRefresh} />}
          ListEmptyComponent={
            user?.isOnline ? (
              listWithoutActiveRide.length === 0 ? (
                availableRides.length === 0 ? (
                  <EmptyState mascot title={t("driverOrdersEmptyTitle")} subtitle={t("driverOrdersEmptySub")} />
                ) : filteredAvailableRides.length === 0 ? (
                  <EmptyState mascot title={t("driverNoFilterMatch")} subtitle={t("driverClearFiltersHint")} />
                ) : (
                  <Text style={{ color: W.muted, textAlign: rtl ? "right" : "left" }}>{t("driverOfferListOnlyActive")}</Text>
                )
              ) : null
            ) : (
              <Text style={{ color: W.muted, textAlign: rtl ? "right" : "left" }}>{t("goOnline")}</Text>
            )
          }
          extraData={listStaggerNonce}
          renderItem={({ item, index }) => <RideRequestRow item={item} index={index} />}
        />
      </View>
      <Modal visible={!!offerModalRide} transparent animationType="fade" onRequestClose={() => !busy && setOfferModalRide(null)}>
        <View style={{ flex: 1, justifyContent: "center", padding: spacing.lg }}>
          <Pressable
            accessibilityRole="button"
            style={[StyleSheet.absoluteFillObject, { backgroundColor: weretPalette.scrim }]}
            onPress={() => !busy && setOfferModalRide(null)}
          />
          <View
            style={{
              zIndex: 1,
              backgroundColor: W.sheet,
              borderRadius: weretRadius.card,
              padding: spacing.lg,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: W.border,
              ...weretElevation.card,
            }}
          >
            <Text style={{ color: W.text, fontWeight: "800", fontSize: 18, textAlign: rtl ? "right" : "left" }}>
              {t("driverOfferModalTitle")}
            </Text>
            <Text style={{ color: W.muted, marginTop: spacing.sm, textAlign: rtl ? "right" : "left" }}>
              {t("driverOfferModalHint")}
            </Text>
            <Text style={{ color: W.muted, marginTop: 4, fontSize: 12, textAlign: rtl ? "right" : "left" }}>
              {offerModalRide
                ? `${t("suggestedFareShort")}: ${Number(offerModalRide.estimatedFare ?? 0).toFixed(0)} · ${t("passengerMinFareShort", {
                    amount: Number(offerModalRide.passengerMinFare ?? offerModalRide.estimatedFare ?? 0).toFixed(0),
                  })}`
                : ""}
            </Text>
            <Text style={{ color: W.text, marginTop: spacing.md, fontWeight: "700", textAlign: rtl ? "right" : "left" }}>
              {t("driverYourOfferAmount")}
            </Text>
            <TextInput
              value={offerFareInput}
              onChangeText={setOfferFareInput}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={W.muted}
              style={{
                marginTop: spacing.sm,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: W.border,
                borderRadius: weretRadius.field,
                padding: spacing.md,
                backgroundColor: W.field,
                color: W.text,
                fontSize: 18,
                fontWeight: "700",
                textAlign: rtl ? "right" : "left",
              }}
            />
            <View style={{ flexDirection: rtl ? "row-reverse" : "row", gap: spacing.sm, marginTop: spacing.lg }}>
              <Pressable
                onPress={() => !busy && setOfferModalRide(null)}
                style={[
                  styles.smallBtn,
                  {
                    flex: 1,
                    backgroundColor: W.field,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: W.border,
                    borderRadius: weretRadius.pill,
                  },
                ]}
              >
                <Text style={[styles.smallBtnText, { color: W.text, textAlign: "center" }]}>{t("back")}</Text>
              </Pressable>
              <Pressable
                onPress={submitDriverOffer}
                disabled={busy}
                style={[
                  styles.smallBtn,
                  {
                    flex: 1,
                    backgroundColor: W.ink,
                    opacity: busy ? 0.6 : 1,
                    borderRadius: weretRadius.pill,
                    paddingVertical: 12,
                  },
                ]}
              >
                <Text style={[styles.smallBtnText, { color: W.onPrimary, textAlign: "center" }]}>
                  {t("driverSubmitPriceOffer")}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  mapArea: { flex: 1, position: "relative" },
  mapShell: { flex: 1, position: "relative" },
  map: { flex: 1 },
  floatingBadge: {
    position: "absolute",
    top: 12,
    start: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  panel: {
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  toggle: { paddingVertical: 14, alignItems: "center" },
  toggleText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  smallBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  smallBtnText: { fontWeight: "700" },
  hintBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  filterRow: { gap: 8, marginBottom: 8 },
  filterField: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    minHeight: 44,
  },
  filterFieldWide: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  filterBadge: { fontWeight: "800", marginEnd: 8, fontSize: 14 },
  filterInput: { flex: 1, fontSize: 14, paddingVertical: 8 },
  requestCard: { borderWidth: 1, padding: 12 },
});
