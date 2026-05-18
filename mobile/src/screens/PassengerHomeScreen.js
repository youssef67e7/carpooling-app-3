import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  I18nManager,
  ScrollView,
  RefreshControl,
  Vibration,
  Pressable,
  useWindowDimensions,
  TextInput,
  ActivityIndicator,
  Animated,
} from "react-native";
import { showAlert } from "../utils/showAlert";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import { useIsFocused } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  fetchNearbyDrivers,
  fetchVehiclesThunk,
  createRideThunk,
  fetchRideById,
  clearRideError,
  updatePassengerLocationThunk,
  respondDriverProposalThunk,
  updatePassengerMinFareThunk,
} from "../store/slices/rideSlice";
import { haversineKm, fareFromVehicle } from "../utils/tripFare";
import { useTheme } from "../context/ThemeProvider";
import { usePolling } from "../hooks/usePolling";
import { routePathToCoords } from "../utils/mapCoords";
import { interpolateMapCoords } from "../utils/routePolyline";
import { getAndroidMapProvider, mapLtrContainerStyle } from "../utils/mapProvider";
import CustomButton from "../components/CustomButton";
import PassengerSeatBookingBlock from "../components/PassengerSeatBookingBlock";
import RideCard from "../components/RideCard";
import SuccessFlash from "../components/ui/SuccessFlash";
import CarMascot from "../components/mascot/CarMascot";
import DriverMapMarker from "../components/map/DriverMapMarker";
import { computeSeatUnits } from "../constants/passengerSeatUnits";
import RideStatusBanner from "../components/RideStatusBanner";
import RateDriverModal from "../components/RateDriverModal";
import PassengerWeretHero from "../components/passenger/PassengerWeretHero";
import { weretPassenger as W } from "../theme/weretPassenger";
import i18n from "../i18n";
import { mapboxAutocomplete } from "../utils/mapboxPlaces";
import { aiRerankPlaces } from "../utils/aiPlaceRerank";

const RECENT_DEST_KEY = "@recent_destinations_v1";

const DEFAULT_REGION = {
  latitude: 24.7136,
  longitude: 46.6753,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};

/** Offline / error fallback — keep in sync with backend seed pricing */
const FALLBACK_VEHICLES = [
  { typeKey: "shipping", nameKey: "shipping", capacity: 1, baseFare: 22, pricePerKm: 3.2 },
  { typeKey: "delivery", nameKey: "delivery", capacity: 4, baseFare: 10, pricePerKm: 2.2 },
  { typeKey: "travel", nameKey: "travel", capacity: 4, baseFare: 38, pricePerKm: 4.8 },
  { typeKey: "motorcycle", nameKey: "motorcycle", capacity: 1, baseFare: 8, pricePerKm: 1.6 },
  { typeKey: "car_standard", nameKey: "car_standard", capacity: 4, baseFare: 9, pricePerKm: 2.0 },
  { typeKey: "car_comfort", nameKey: "car_comfort", capacity: 4, baseFare: 15, pricePerKm: 3.0 },
];

const TRACKING_STATUSES = ["pending", "accepted", "ongoing"];

export default function PassengerHomeScreen({ navigation }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { colors, spacing, radius, isDark } = useTheme();
  const isFocused = useIsFocused();
  const rtl = I18nManager.isRTL;

  const { vehicles, nearbyDrivers, activeRide, error } = useSelector((s) => s.ride);
  const [pickup, setPickup] = useState(null);
  const [destination, setDestination] = useState(null);
  const [selectedVehicleType, setSelectedVehicleType] = useState("delivery");
  const [passengerCount, setPassengerCount] = useState(1);
  const [passengerSize, setPassengerSize] = useState("MEDIUM");
  const [parcelDescription, setParcelDescription] = useState("");
  const [parcelReceiverName, setParcelReceiverName] = useState("");
  const [parcelReceiverPhone, setParcelReceiverPhone] = useState("");
  const [parcelNotes, setParcelNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const [bookingSuccessVisible, setBookingSuccessVisible] = useState(false);
  const [selectedNearbyDriverId, setSelectedNearbyDriverId] = useState(null);
  const [proposalBusy, setProposalBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [locationAllowed, setLocationAllowed] = useState(false);
  /** ما الذي تضبطه الخريطة عند الضغط: انطلاق أو وجهة — مربوط ببطاقتي «مكاني» و«الوجهة» */
  const [mapEditTarget, setMapEditTarget] = useState("pickup");
  const [pickupPlaceQuery, setPickupPlaceQuery] = useState("");
  const [pickupPlaceSuggest, setPickupPlaceSuggest] = useState([]);
  const [pickupPlaceLoading, setPickupPlaceLoading] = useState(false);
  const [destPlaceQuery, setDestPlaceQuery] = useState("");
  const [destPlaceSuggest, setDestPlaceSuggest] = useState([]);
  const [destPlaceLoading, setDestPlaceLoading] = useState(false);
  const [destPlaceFocused, setDestPlaceFocused] = useState(false);
  const [recentDestinations, setRecentDestinations] = useState([]);
  const mapRef = useRef(null);
  const pickupRef = useRef(null);
  const destinationRef = useRef(null);
  const prevActiveRideIdRef = useRef(null);
  const { height: windowHeight } = useWindowDimensions();
  const sheetMaxHeight = Math.round(windowHeight * 0.52);
  const mapMinHeight = Math.round(windowHeight * 0.34);
  const mapAnim = useRef(new Animated.Value(1)).current;
  const mapShownRef = useRef(true);

  const rideId = activeRide?._id;
  const rideStatus = activeRide?.status;
  const needsRating = activeRide?.status === "completed" && activeRide.passengerRating == null;
  const mapLocked =
    !!activeRide &&
    (["pending", "accepted", "ongoing"].includes(activeRide.status) || needsRating);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationAllowed(status === "granted");
    })();
  }, []);

  useEffect(() => {
    if (!locationAllowed) return;
    let cancelled = false;
    (async () => {
      try {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;
        const r = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          latitudeDelta: DEFAULT_REGION.latitudeDelta,
          longitudeDelta: DEFAULT_REGION.longitudeDelta,
        };
        mapRef.current?.animateToRegion(r, 450);
      } catch {
        /* keep default region */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locationAllowed]);

  useEffect(() => {
    pickupRef.current = pickup;
  }, [pickup]);

  useEffect(() => {
    destinationRef.current = destination;
  }, [destination]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(RECENT_DEST_KEY);
        if (!alive) return;
        const arr = JSON.parse(raw || "[]");
        if (Array.isArray(arr)) setRecentDestinations(arr.slice(0, 10));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /** Only clear draft pins when a ride truly ended (had id → cleared), not on every idle render */
  useEffect(() => {
    const id = activeRide?._id ?? null;
    const prev = prevActiveRideIdRef.current;
    prevActiveRideIdRef.current = id;
    if (prev && !id) {
      pickupRef.current = null;
      destinationRef.current = null;
      setPickup(null);
      setDestination(null);
      setMapEditTarget("pickup");
      setPickupPlaceQuery("");
      setPickupPlaceSuggest([]);
      setDestPlaceQuery("");
      setDestPlaceSuggest([]);
    }
  }, [activeRide]);

  useEffect(() => {
    dispatch(fetchVehiclesThunk());
  }, [dispatch]);

  useEffect(() => {
    const list = vehicles?.length ? vehicles : FALLBACK_VEHICLES;
    const keys = list.map((v) => v.typeKey);
    if (!keys.includes(selectedVehicleType)) {
      setSelectedVehicleType(keys[0]);
    }
  }, [vehicles, selectedVehicleType]);

  const pollRide = useCallback(() => {
    if (rideId) dispatch(fetchRideById(rideId));
  }, [dispatch, rideId]);

  const pollNearby = useCallback(() => {
    dispatch(fetchNearbyDrivers(selectedVehicleType));
  }, [dispatch, selectedVehicleType]);

  const pushPassengerLocation = useCallback(async () => {
    if (!locationAllowed || !rideId) return;
    if (!TRACKING_STATUSES.includes(rideStatus)) return;
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await dispatch(
        updatePassengerLocationThunk({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      ).unwrap();
    } catch {
      /* ignore */
    }
  }, [dispatch, locationAllowed, rideId, rideStatus]);

  const trackingRide = !!rideId && TRACKING_STATUSES.includes(rideStatus);

  usePolling(pollRide, 2000, !!rideId && rideStatus !== "completed", isFocused);
  usePolling(pollNearby, 8000, isFocused && !activeRide, isFocused);
  usePolling(pushPassengerLocation, 2500, trackingRide && isFocused, isFocused);

  useEffect(() => {
    if (isFocused && !activeRide) dispatch(fetchNearbyDrivers(selectedVehicleType));
  }, [dispatch, isFocused, activeRide, selectedVehicleType]);

  useEffect(() => {
    if (!isFocused || rideStatus !== "ongoing") return undefined;
    const id = setInterval(() => {
      Vibration.vibrate(55);
    }, 18000);
    return () => clearInterval(id);
  }, [rideStatus, isFocused]);

  const onMapPress = useCallback(
    (e) => {
      if (mapLocked) return;
      setSelectedNearbyDriverId(null);
      const { latitude, longitude } = e.nativeEvent.coordinate;
      const coord = { latitude, longitude };
      const hasPickup = pickupRef.current != null && pickupRef.current.latitude != null;

      if (mapEditTarget === "pickup") {
        pickupRef.current = coord;
        setPickup(coord);
        setMapEditTarget("destination");
        return;
      }

      if (!hasPickup) {
        setMapEditTarget("pickup");
        showAlert(t("error"), t("setPickupBeforeDestination"));
        return;
      }
      destinationRef.current = coord;
      setDestination(coord);
    },
    [mapLocked, mapEditTarget, t]
  );

  const pickupCoord = useMemo(() => {
    if (activeRide?.pickupLocation?.lat != null) {
      return { latitude: activeRide.pickupLocation.lat, longitude: activeRide.pickupLocation.lng };
    }
    return pickup;
  }, [activeRide, pickup]);

  const destCoord = useMemo(() => {
    if (activeRide?.destinationLocation?.lat != null) {
      return { latitude: activeRide.destinationLocation.lat, longitude: activeRide.destinationLocation.lng };
    }
    return destination;
  }, [activeRide, destination]);

  /** Pickup → destination (full trip) */
  const tripRouteCoords = useMemo(() => {
    const fromRide = routePathToCoords(activeRide?.routePath);
    if (fromRide.length > 1) return fromRide;
    if (pickupCoord && destCoord) return [pickupCoord, destCoord];
    return [];
  }, [activeRide, pickupCoord, destCoord]);

  /** Driver → pickup while driver is heading to you */
  const driverApproachCoords = useMemo(() => {
    if (rideStatus !== "accepted" || !driverCoord || !pickupCoord) return [];
    return interpolateMapCoords(driverCoord, pickupCoord, 22);
  }, [rideStatus, driverCoord, pickupCoord]);

  const driverCoord = useMemo(() => {
    const loc = activeRide?.driverId?.location;
    if (!loc?.lat || !loc?.lng) return null;
    if (!activeRide.driverId) return null;
    if (rideStatus === "pending") return null;
    return { latitude: loc.lat, longitude: loc.lng };
  }, [activeRide, rideStatus]);

  useEffect(() => {
    const shouldFit =
      trackingRide || (pickupCoord && destCoord && !activeRide);
    if (!shouldFit) return undefined;
    const pts = [];
    if (activeRide && rideStatus === "accepted") {
      if (driverCoord) pts.push({ latitude: driverCoord.latitude, longitude: driverCoord.longitude });
      if (pickupCoord) pts.push({ latitude: pickupCoord.latitude, longitude: pickupCoord.longitude });
    } else if (activeRide && rideStatus === "ongoing") {
      tripRouteCoords.forEach((c) => pts.push({ latitude: c.latitude, longitude: c.longitude }));
      if (driverCoord) pts.push({ latitude: driverCoord.latitude, longitude: driverCoord.longitude });
    } else {
      if (pickupCoord) pts.push({ latitude: pickupCoord.latitude, longitude: pickupCoord.longitude });
      if (destCoord) pts.push({ latitude: destCoord.latitude, longitude: destCoord.longitude });
      if (driverCoord) pts.push({ latitude: driverCoord.latitude, longitude: driverCoord.longitude });
    }
    if (pts.length === 0) return undefined;
    const raf = requestAnimationFrame(() => {
      mapRef.current?.fitToCoordinates(pts, {
        edgePadding: { top: 56, right: 24, bottom: 300, left: 24 },
        animated: true,
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [
    trackingRide,
    activeRide,
    rideStatus,
    tripRouteCoords,
    pickupCoord?.latitude,
    pickupCoord?.longitude,
    destCoord?.latitude,
    destCoord?.longitude,
    driverCoord?.latitude,
    driverCoord?.longitude,
  ]);

  const showOtherDriversOnMap = !activeRide;

  const driverMarkerColor = useCallback((vt) => {
    const k = String(vt || "").toLowerCase();
    if (k === "shipping") return "#15803d";
    if (k === "delivery") return "#2563eb";
    if (k === "travel") return "#0891b2";
    if (k === "motorcycle") return "#ca8a04";
    if (k === "car_standard") return "#64748b";
    if (k === "car_comfort") return "#9333ea";
    if (k === "xl") return "#ea580c";
    if (k === "premium") return "#7c3aed";
    return "#16a34a";
  }, []);

  const vehicleList = useMemo(
    () => (vehicles?.length ? vehicles : FALLBACK_VEHICLES),
    [vehicles]
  );

  const selectedVehicleDoc = useMemo(
    () => vehicleList.find((v) => v.typeKey === selectedVehicleType) || vehicleList[0],
    [vehicleList, selectedVehicleType]
  );

  const routeDistanceKm = useMemo(() => {
    if (!pickup || !destination) return null;
    return haversineKm(pickup.latitude, pickup.longitude, destination.latitude, destination.longitude);
  }, [pickup, destination]);

  const priceInfoAmount = useMemo(() => {
    if (!selectedVehicleDoc) return null;
    if (routeDistanceKm != null) {
      return fareFromVehicle(selectedVehicleDoc.baseFare, selectedVehicleDoc.pricePerKm, routeDistanceKm).toFixed(0);
    }
    return Number(selectedVehicleDoc.baseFare).toFixed(0);
  }, [routeDistanceKm, selectedVehicleDoc]);

  const suggestedAmountNum = useMemo(() => {
    if (!selectedVehicleDoc) return 0;
    if (routeDistanceKm != null) {
      return Math.round(fareFromVehicle(selectedVehicleDoc.baseFare, selectedVehicleDoc.pricePerKm, routeDistanceKm) * 100) / 100;
    }
    return Math.round(Number(selectedVehicleDoc.baseFare || 0) * 100) / 100;
  }, [routeDistanceKm, selectedVehicleDoc]);

  const [passengerMinOffer, setPassengerMinOffer] = useState(0);
  useEffect(() => {
    if (!(suggestedAmountNum > 0)) return;
    setPassengerMinOffer((prev) => {
      const next = prev > 0 ? prev : suggestedAmountNum;
      return Math.round(Math.max(suggestedAmountNum, next) * 100) / 100;
    });
  }, [suggestedAmountNum]);

  const [pendingMinDraft, setPendingMinDraft] = useState("");
  useEffect(() => {
    if (!activeRide || rideStatus !== "pending") return;
    const m = Number(activeRide.passengerMinFare ?? activeRide.estimatedFare ?? 0);
    if (m > 0) setPendingMinDraft(String(Math.round(m * 100) / 100));
  }, [activeRide?.passengerMinFare, activeRide?.estimatedFare, rideStatus, activeRide?._id]);

  const prevAwaitingDriverRef = useRef(false);
  useEffect(() => {
    const r = activeRide;
    if (!r || rideStatus !== "pending") {
      prevAwaitingDriverRef.current = false;
      return;
    }
    if (r.awaitingDriverConfirm) prevAwaitingDriverRef.current = true;
    else if (prevAwaitingDriverRef.current && !r.driverId) {
      prevAwaitingDriverRef.current = false;
      showAlert(t("driverDeclinedBookingTitle"), t("driverDeclinedBookingBody"));
    }
  }, [activeRide, rideStatus, t]);

  const formatCoordShort = useCallback((pt) => {
    if (pt == null || pt.latitude == null || pt.longitude == null) return "";
    if (pt.label && String(pt.label).trim()) {
      const s = String(pt.label).trim();
      return s.length > 64 ? `${s.slice(0, 61)}…` : s;
    }
    return `${Number(pt.latitude).toFixed(4)}, ${Number(pt.longitude).toFixed(4)}`;
  }, []);

  useEffect(() => {
    const q = pickupPlaceQuery.trim();
    if (q.length < 2) {
      setPickupPlaceSuggest([]);
      setPickupPlaceLoading(false);
      return undefined;
    }
    setPickupPlaceLoading(true);
    let cancelled = false;
    const id = setTimeout(() => {
      const proximity = pickupRef.current || null;
      mapboxAutocomplete(q, {
        lang: i18n.language || "en",
        limit: 6,
        proximity,
      })
        .then(async (rows) => {
          const reranked = await aiRerankPlaces({
            query: q,
            lang: i18n.language || "en",
            proximity,
            suggestions: rows,
          });
          if (!cancelled) setPickupPlaceSuggest(reranked);
        })
        .catch(() => {
          if (!cancelled) setPickupPlaceSuggest([]);
        })
        .finally(() => {
          if (!cancelled) setPickupPlaceLoading(false);
        });
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [pickupPlaceQuery]);

  useEffect(() => {
    const q = destPlaceQuery.trim();
    if (q.length < 2) {
      setDestPlaceSuggest([]);
      setDestPlaceLoading(false);
      return undefined;
    }
    setDestPlaceLoading(true);
    let cancelled = false;
    const id = setTimeout(() => {
      const proximity = pickupRef.current || null;
      mapboxAutocomplete(q, {
        lang: i18n.language || "en",
        limit: 6,
        proximity,
      })
        .then(async (rows) => {
          const reranked = await aiRerankPlaces({
            query: q,
            lang: i18n.language || "en",
            proximity,
            suggestions: rows,
          });
          if (!cancelled) setDestPlaceSuggest(reranked);
        })
        .catch(() => {
          if (!cancelled) setDestPlaceSuggest([]);
        })
        .finally(() => {
          if (!cancelled) setDestPlaceLoading(false);
        });
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [destPlaceQuery]);

  const applyPickupSuggestion = useCallback(
    (row) => {
      if (mapLocked) return;
      const coord = { latitude: row.latitude, longitude: row.longitude, label: row.label };
      pickupRef.current = coord;
      setPickup(coord);
      setPickupPlaceSuggest([]);
      setPickupPlaceQuery("");
      setMapEditTarget("destination");
      mapRef.current?.animateToRegion(
        {
          latitude: row.latitude,
          longitude: row.longitude,
          latitudeDelta: DEFAULT_REGION.latitudeDelta,
          longitudeDelta: DEFAULT_REGION.longitudeDelta,
        },
        400
      );
    },
    [mapLocked]
  );

  const applyDestSuggestion = useCallback(
    (row) => {
      if (mapLocked) return;
      if (pickupRef.current == null || pickupRef.current.latitude == null) {
        showAlert(t("error"), t("setPickupBeforeDestination"));
        return;
      }
      const coord = { latitude: row.latitude, longitude: row.longitude, label: row.label };
      destinationRef.current = coord;
      setDestination(coord);
      try {
        const next = [
          { id: row.id, label: row.label, latitude: row.latitude, longitude: row.longitude },
          ...recentDestinations.filter((x) => x && x.id !== row.id),
        ].slice(0, 10);
        setRecentDestinations(next);
        AsyncStorage.setItem(RECENT_DEST_KEY, JSON.stringify(next)).catch(() => {});
      } catch {
        /* ignore */
      }
      setDestPlaceSuggest([]);
      setDestPlaceQuery("");
      mapRef.current?.animateToRegion(
        {
          latitude: row.latitude,
          longitude: row.longitude,
          latitudeDelta: DEFAULT_REGION.latitudeDelta,
          longitude: DEFAULT_REGION.longitudeDelta,
        },
        400
      );
    },
    [mapLocked, t, recentDestinations]
  );

  const setPickupFromMyLocation = useCallback(async () => {
    if (mapLocked) return;
    if (!locationAllowed) {
      showAlert(t("error"), t("locationPermission"));
      return;
    }
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const coord = { latitude: lat, longitude: lng };
      pickupRef.current = coord;
      setPickup(coord);
      setMapEditTarget("destination");
      mapRef.current?.animateToRegion(
        {
          latitude: lat,
          longitude: lng,
          latitudeDelta: DEFAULT_REGION.latitudeDelta,
          longitudeDelta: DEFAULT_REGION.longitudeDelta,
        },
        400
      );
    } catch {
      showAlert(t("error"), t("locationPermission"));
    }
  }, [locationAllowed, mapLocked, t]);

  const selectedCapacity = useMemo(
    () => Math.max(1, Number(selectedVehicleDoc?.capacity) || 4),
    [selectedVehicleDoc]
  );
  const seatUnitsForBooking = useMemo(
    () => computeSeatUnits(passengerCount, passengerSize),
    [passengerCount, passengerSize]
  );
  const isShipping = selectedVehicleType === "shipping";
  const canRequestRide = Boolean(
    pickup &&
      destination &&
      selectedVehicleType &&
      (isShipping ? parcelDescription.trim().length > 0 : seatUnitsForBooking <= selectedCapacity)
  );

  async function requestRide() {
    if (!pickup || !destination) {
      if (!pickup) {
        setMapEditTarget("pickup");
        showAlert(t("error"), t("requestRideNeedPickup"));
      } else {
        setMapEditTarget("destination");
        showAlert(t("error"), t("requestRideNeedDestination"));
      }
      return;
    }
    if (!selectedVehicleType) {
      showAlert(t("error"), t("selectVehicleBeforeRequest"));
      return;
    }
    if (isShipping && !parcelDescription.trim()) {
      showAlert(t("error"), t("parcelNeedDescription"));
      return;
    }
    if (seatUnitsForBooking > selectedCapacity) {
      showAlert(t("error"), t("bookingOverCapacity"));
      return;
    }
    dispatch(clearRideError());
    setCreating(true);
    try {
      const minFare =
        suggestedAmountNum > 0
          ? Math.round(Math.max(suggestedAmountNum, passengerMinOffer || suggestedAmountNum) * 100) / 100
          : undefined;
      await dispatch(
        createRideThunk({
          vehicleType: selectedVehicleType,
          pickupLocation: { lat: pickup.latitude, lng: pickup.longitude },
          destinationLocation: { lat: destination.latitude, lng: destination.longitude },
          passengerMinFare: minFare,
          passengerCount,
          passengerSize,
          parcel: isShipping
            ? {
                description: parcelDescription,
                receiverName: parcelReceiverName,
                receiverPhone: parcelReceiverPhone,
                notes: parcelNotes,
              }
            : undefined,
        })
      ).unwrap();
      setBookingSuccessVisible(true);
      setTimeout(() => setBookingSuccessVisible(false), 1700);
    } catch (e) {
      showAlert(t("error"), String(e));
    } finally {
      setCreating(false);
    }
  }

  async function respondProposal(accept) {
    if (!rideId) return;
    dispatch(clearRideError());
    setProposalBusy(true);
    try {
      await dispatch(respondDriverProposalThunk({ rideId, accept })).unwrap();
    } catch (e) {
      showAlert(t("error"), String(e));
    } finally {
      setProposalBusy(false);
    }
  }

  async function savePendingMinFare() {
    if (!rideId || !activeRide) return;
    const minF = Math.round(Number(activeRide.estimatedFare ?? 0) * 100) / 100;
    const n = parseFloat(String(pendingMinDraft).replace(",", "."));
    if (Number.isNaN(n) || n < minF) {
      showAlert(t("error"), t("passengerMinBelowSuggested"));
      return;
    }
    dispatch(clearRideError());
    setProposalBusy(true);
    try {
      await dispatch(updatePassengerMinFareThunk({ rideId, passengerMinFare: Math.round(n * 100) / 100 })).unwrap();
    } catch (e) {
      showAlert(t("error"), String(e));
    } finally {
      setProposalBusy(false);
    }
  }

  function adjustPassengerOffer(delta) {
    if (!(suggestedAmountNum > 0)) return;
    setPassengerMinOffer((v) => {
      const base = v > 0 ? v : suggestedAmountNum;
      return Math.max(suggestedAmountNum, Math.round((base + delta) * 100) / 100);
    });
  }

  const mapProvider = getAndroidMapProvider();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await dispatch(fetchNearbyDrivers(selectedVehicleType));
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, selectedVehicleType]);

  return (
    <View style={[styles.root, { backgroundColor: isDark ? colors.bg : "#f2f2f2" }]}>
      <Animated.View
        style={[
          styles.mapShell,
          mapLtrContainerStyle,
          {
            minHeight: mapMinHeight,
            opacity: mapAnim,
            transform: [
              {
                translateY: mapAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-mapMinHeight, 0],
                }),
              },
            ],
          },
        ]}
      >
        {!activeRide ? (
          <View
            style={[
              styles.mapLinkBanner,
              {
                flexDirection: rtl ? "row-reverse" : "row",
                backgroundColor: W.pillOverlay,
                borderColor: "transparent",
              },
            ]}
            pointerEvents="none"
          >
            <MaterialCommunityIcons
              name={mapEditTarget === "pickup" ? "map-marker-radius" : "map-marker"}
              size={18}
              color={W.onPrimary}
            />
            <Text style={[styles.mapLinkBannerText, { color: W.onPrimary }]}>
              {mapEditTarget === "pickup" ? t("mapLinkedPickup") : t("mapLinkedDestination")}
            </Text>
          </View>
        ) : null}
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={mapProvider}
          initialRegion={DEFAULT_REGION}
          onPress={onMapPress}
          showsUserLocation={locationAllowed}
          showsMyLocationButton={false}
          userInterfaceStyle={isDark ? "dark" : "light"}
          pitchEnabled={false}
          rotateEnabled={false}
        >
          <Fragment>
            {pickupCoord ? <Marker coordinate={pickupCoord} title={t("pickup")} /> : null}
            {destCoord ? <Marker coordinate={destCoord} pinColor={colors.danger} title={t("destination")} /> : null}
            {driverCoord ? (
              <Marker coordinate={driverCoord} title={t("driverOnMap")} pinColor={colors.success} />
            ) : null}
            {activeRide && rideStatus === "pending" && tripRouteCoords.length > 1 ? (
              <Polyline coordinates={tripRouteCoords} strokeColor={colors.primary} strokeWidth={4} />
            ) : null}
            {activeRide && rideStatus === "ongoing" && tripRouteCoords.length > 1 ? (
              <Polyline coordinates={tripRouteCoords} strokeColor={colors.primary} strokeWidth={4} />
            ) : null}
            {activeRide && rideStatus === "accepted" && tripRouteCoords.length > 1 ? (
              <Polyline
                coordinates={tripRouteCoords}
                strokeColor={colors.textMuted}
                strokeWidth={2}
                lineDashPattern={[10, 6]}
              />
            ) : null}
            {activeRide && rideStatus === "accepted" && driverApproachCoords.length > 1 ? (
              <Polyline coordinates={driverApproachCoords} strokeColor="#f59e0b" strokeWidth={4} />
            ) : null}
            {!activeRide && tripRouteCoords.length > 1 ? (
              <Polyline coordinates={tripRouteCoords} strokeColor={W.accent} strokeWidth={4} />
            ) : null}
            {showOtherDriversOnMap
              ? nearbyDrivers.map((d) =>
                  d.location?.lat && d.location?.lng ? (
                    <DriverMapMarker
                      key={d._id}
                      identifier={`drv-${d._id}`}
                      coordinate={{ latitude: d.location.lat, longitude: d.location.lng }}
                      title={d.name}
                      pinColor={driverMarkerColor(d.vehicleType)}
                      selected={String(selectedNearbyDriverId) === String(d._id)}
                      onPress={() => setSelectedNearbyDriverId(d._id)}
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
              bottom: 56,
              start: 10,
              end: 10,
              backgroundColor: (colors.surface || "#1c1c1c") + "EE",
              borderRadius: 10,
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ color: colors.text, fontSize: 12, fontWeight: "700", textAlign: rtl ? "right" : "left" }}>
              {rideStatus === "accepted" ? t("mapLegendToPickupPassenger") : t("mapLegendTripPassenger")}
            </Text>
          </View>
        ) : null}
        {locationAllowed ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("recenterMap")}
            style={({ pressed }) => [
              styles.gpsFab,
              {
                backgroundColor: W.sheet,
                opacity: pressed ? 0.85 : 1,
                borderColor: W.border,
              },
            ]}
            onPress={async () => {
              try {
                const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                mapRef.current?.animateToRegion(
                  {
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    latitudeDelta: DEFAULT_REGION.latitudeDelta,
                    longitudeDelta: DEFAULT_REGION.longitudeDelta,
                  },
                  400
                );
              } catch {
                /* ignore */
              }
            }}
          >
            <MaterialCommunityIcons name="crosshairs-gps" size={22} color={W.ink} />
          </Pressable>
        ) : null}
      </Animated.View>
      <ScrollView
        style={[
          styles.panel,
          {
            maxHeight: sheetMaxHeight,
            flexGrow: 0,
            backgroundColor: W.sheet,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          },
        ]}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        scrollEventThrottle={16}
        onScroll={(e) => {
          const y = e?.nativeEvent?.contentOffset?.y ?? 0;
          if (activeRide) return;
          if (y > 40 && mapShownRef.current) {
            mapShownRef.current = false;
            Animated.timing(mapAnim, { toValue: 0, duration: 160, useNativeDriver: true }).start();
          } else if (y < 10 && !mapShownRef.current) {
            mapShownRef.current = true;
            Animated.timing(mapAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
          }
        }}
      >
        {activeRide && rideStatus !== "completed" ? <RideStatusBanner status={rideStatus} /> : null}

        {activeRide && rideStatus === "pending" && activeRide.awaitingDriverConfirm ? (
          <View
            style={{
              marginTop: spacing.md,
              padding: spacing.md,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surfaceMuted,
            }}
          >
            <Text style={{ color: colors.text, fontWeight: "800", textAlign: rtl ? "right" : "left" }}>
              {t("passengerAwaitingDriverConfirm")}
            </Text>
            <Text style={{ color: colors.textMuted, marginTop: 6, textAlign: rtl ? "right" : "left" }}>
              {t("passengerAwaitingDriverConfirmSub", {
                amount: Number(activeRide.preassignedFare ?? 0).toFixed(0),
              })}
            </Text>
          </View>
        ) : null}

        {activeRide && rideStatus === "pending" && activeRide.driverProposal?.driverId ? (
          <View
            style={{
              marginTop: spacing.md,
              padding: spacing.md,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.primary,
              backgroundColor: colors.surfaceMuted,
            }}
          >
            <Text style={{ color: colors.text, fontWeight: "800", textAlign: rtl ? "right" : "left" }}>
              {t("passengerDriverOfferTitle", {
                name: activeRide.driverProposal.driverId?.name || t("driver"),
                amount: Number(activeRide.driverProposal.proposedFare ?? 0).toFixed(0),
              })}
            </Text>
            <Text style={{ color: colors.textMuted, marginTop: 6, textAlign: rtl ? "right" : "left" }}>
              {t("passengerYourMinIs", {
                amount: Number(activeRide.passengerMinFare ?? activeRide.estimatedFare ?? 0).toFixed(0),
              })}
            </Text>
            <View style={{ flexDirection: rtl ? "row-reverse" : "row", gap: spacing.sm, marginTop: spacing.md }}>
              <CustomButton
                style={{ flex: 1 }}
                title={t("passengerRejectOffer")}
                variant="outline"
                onPress={() => respondProposal(false)}
                disabled={proposalBusy}
              />
              <CustomButton
                style={{ flex: 1 }}
                title={t("passengerAcceptOffer")}
                variant="lime"
                onPress={() => respondProposal(true)}
                disabled={proposalBusy}
                loading={proposalBusy}
              />
            </View>
          </View>
        ) : null}

        {activeRide && rideStatus === "pending" && !activeRide.driverId && !activeRide.awaitingDriverConfirm ? (
          <View style={{ marginTop: spacing.md }}>
            <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: spacing.xs, textAlign: rtl ? "right" : "left" }}>
              {t("passengerUpdateMinWhileWaiting")}
            </Text>
            <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: spacing.sm }}>
              <TextInput
                value={pendingMinDraft}
                onChangeText={setPendingMinDraft}
                keyboardType="decimal-pad"
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  color: colors.text,
                  textAlign: rtl ? "right" : "left",
                }}
              />
              <CustomButton title={t("passengerSaveMinFare")} onPress={savePendingMinFare} disabled={proposalBusy} loading={proposalBusy} />
            </View>
          </View>
        ) : null}

        {!activeRide ? (
          <>
            <PassengerWeretHero
              appName={t("appName")}
              nearbyCount={nearbyDrivers.length}
              vehicleList={vehicleList}
              selectedVehicleType={selectedVehicleType}
              onSelectVehicleType={setSelectedVehicleType}
            />
            <Text style={[styles.sheetTitle, { color: W.text, textAlign: rtl ? "right" : "left" }]}>
              {t("rideSheetTitle")}
            </Text>

            <Text
              style={{
                color: W.muted,
                fontSize: 11,
                fontWeight: "800",
                letterSpacing: 1.2,
                textTransform: "uppercase",
                marginBottom: spacing.sm,
                textAlign: rtl ? "right" : "left",
              }}
            >
              {t("routeSectionTitle")}
            </Text>

            <View
              style={[
                styles.routeCard,
                {
                  backgroundColor: W.field,
                  borderColor: mapEditTarget === "pickup" ? W.ink : W.border,
                  borderWidth: mapEditTarget === "pickup" ? 2 : 1,
                },
              ]}
            >
              <Pressable
                onPress={() => setMapEditTarget("pickup")}
                accessibilityRole="button"
                accessibilityState={{ selected: mapEditTarget === "pickup" }}
                style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1 }]}
              >
                <View style={[styles.routeCardHeader, { flexDirection: rtl ? "row-reverse" : "row" }]}>
                  <MaterialCommunityIcons name="map-marker-radius" size={22} color={W.ink} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: W.muted, fontSize: 11, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase", textAlign: rtl ? "right" : "left" }}>
                      {t("pickupFromMyLocationLabel")}
                    </Text>
                    <Text style={{ color: W.text, fontWeight: "700", textAlign: rtl ? "right" : "left", marginTop: 2 }}>
                      {pickup ? formatCoordShort(pickup) : t("pickupNotSet")}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name={rtl ? "chevron-left" : "chevron-right"} size={22} color={W.muted} />
                </View>
              </Pressable>
              <Pressable
                onPress={() => {
                  setMapEditTarget("pickup");
                  void setPickupFromMyLocation();
                }}
                disabled={!locationAllowed}
                style={({ pressed }) => [
                  styles.routeActionBtn,
                  {
                    flexDirection: rtl ? "row-reverse" : "row",
                    backgroundColor: W.sheet,
                    borderColor: W.ink,
                    opacity: pressed ? 0.88 : !locationAllowed ? 0.45 : 1,
                  },
                ]}
              >
                <MaterialCommunityIcons name="crosshairs-gps" size={18} color={W.ink} />
                <Text style={{ color: W.ink, fontWeight: "800", marginHorizontal: 8 }}>{t("useMyLocationForPickup")}</Text>
              </Pressable>
              <Text style={{ color: W.muted, fontSize: 11, marginTop: spacing.sm, textAlign: rtl ? "right" : "left" }}>
                {mapEditTarget === "pickup"
                  ? t("mapTapAppliesToPickup")
                  : pickup
                    ? t("pickupSetTapDestinationCard")
                    : t("orTapMapForPickup")}
              </Text>
              <Text
                style={{
                  color: W.muted,
                  fontSize: 11,
                  marginTop: spacing.sm,
                  textAlign: rtl ? "right" : "left",
                  fontWeight: "600",
                }}
              >
                {t("placeSearchByNameHint")}
              </Text>
              <View
                style={{
                  flexDirection: rtl ? "row-reverse" : "row",
                  alignItems: "center",
                  marginTop: spacing.xs,
                  borderWidth: 1,
                  borderColor: W.border,
                  borderRadius: 14,
                  backgroundColor: W.sheet,
                  paddingHorizontal: 10,
                }}
              >
                <MaterialCommunityIcons name="magnify" size={20} color={W.muted} />
                <TextInput
                  value={pickupPlaceQuery}
                  onChangeText={setPickupPlaceQuery}
                  placeholder={t("placeSearchInputPlaceholder")}
                  placeholderTextColor={W.muted}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    color: W.text,
                    textAlign: rtl ? "right" : "left",
                  }}
                  editable={!mapLocked}
                />
                {pickupPlaceLoading ? <ActivityIndicator size="small" color={W.accent} /> : null}
              </View>
              {pickupPlaceSuggest.length > 0 ? (
                <ScrollView
                  style={{ maxHeight: 140, marginTop: spacing.xs }}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                >
                  {pickupPlaceSuggest.map((row) => (
                    <Pressable
                      key={row.id}
                      onPress={() => applyPickupSuggestion(row)}
                      style={({ pressed }) => ({
                        paddingVertical: 10,
                        paddingHorizontal: 8,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderColor: colors.border,
                        opacity: pressed ? 0.85 : 1,
                      })}
                    >
                      <Text
                        style={{ color: colors.text, fontSize: 13, textAlign: rtl ? "right" : "left" }}
                        numberOfLines={3}
                      >
                        {row.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}
            </View>

            <View style={[styles.routeConnector, { flexDirection: rtl ? "row-reverse" : "row" }]}>
              <View style={[styles.routeConnectorLine, { backgroundColor: W.border }]} />
              <Text style={{ color: W.muted, fontSize: 11, fontWeight: "600", paddingHorizontal: 8 }}>
                {t("routeConnectorLabel")}
              </Text>
              <View style={[styles.routeConnectorLine, { backgroundColor: W.border }]} />
            </View>

            <View
              style={[
                styles.routeCard,
                {
                  backgroundColor: W.field,
                  borderColor: mapEditTarget === "destination" ? W.ink : W.border,
                  borderWidth: mapEditTarget === "destination" ? 2 : 1,
                  marginTop: 0,
                },
              ]}
            >
              <Pressable
                onPress={() => setMapEditTarget("destination")}
                accessibilityRole="button"
                accessibilityState={{ selected: mapEditTarget === "destination" }}
                disabled={!pickup}
                style={({ pressed }) => [{ opacity: pressed ? 0.88 : !pickup ? 0.5 : 1 }]}
              >
                <View style={[styles.routeCardHeader, { flexDirection: rtl ? "row-reverse" : "row" }]}>
                  <MaterialCommunityIcons name="map-marker" size={22} color={W.ink} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: W.muted, fontSize: 11, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase", textAlign: rtl ? "right" : "left" }}>
                      {t("destinationSectionLabel")}
                    </Text>
                    <Text style={{ color: W.text, fontWeight: "700", textAlign: rtl ? "right" : "left", marginTop: 2 }}>
                      {destination ? formatCoordShort(destination) : t("destinationNotSet")}
                    </Text>
                  </View>
                </View>
              </Pressable>
              <Text
                style={{
                  color: W.muted,
                  fontSize: 11,
                  marginTop: spacing.sm,
                  textAlign: rtl ? "right" : "left",
                  fontWeight: "600",
                }}
              >
                {t("placeSearchDestinationHint")}
              </Text>
              <View
                style={{
                  flexDirection: rtl ? "row-reverse" : "row",
                  alignItems: "center",
                  marginTop: spacing.xs,
                  borderWidth: 1,
                  borderColor: W.border,
                  borderRadius: 14,
                  backgroundColor: W.sheet,
                  paddingHorizontal: 10,
                  opacity: pickup ? 1 : 0.5,
                }}
              >
                <MaterialCommunityIcons name="magnify" size={20} color={W.muted} />
                <TextInput
                  value={destPlaceQuery}
                  onChangeText={setDestPlaceQuery}
                  onFocus={() => setDestPlaceFocused(true)}
                  onBlur={() => setDestPlaceFocused(false)}
                  placeholder={t("placeSearchDestinationPlaceholder")}
                  placeholderTextColor={W.muted}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    color: W.text,
                    textAlign: rtl ? "right" : "left",
                  }}
                  editable={!mapLocked && !!pickup}
                />
                {destPlaceLoading ? <ActivityIndicator size="small" color={W.accent} /> : null}
              </View>
              {destPlaceSuggest.length > 0 ? (
                <ScrollView
                  style={{ maxHeight: 140, marginTop: spacing.xs }}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                >
                  {destPlaceSuggest.map((row) => (
                    <Pressable
                      key={row.id}
                      onPress={() => applyDestSuggestion(row)}
                      style={({ pressed }) => ({
                        paddingVertical: 10,
                        paddingHorizontal: 8,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderColor: colors.border,
                        opacity: pressed ? 0.85 : 1,
                      })}
                    >
                      <Text
                        style={{ color: colors.text, fontSize: 13, textAlign: rtl ? "right" : "left" }}
                        numberOfLines={3}
                      >
                        {row.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}
              {destPlaceSuggest.length === 0 && destPlaceFocused && !destPlaceQuery.trim() && recentDestinations.length > 0 ? (
                <ScrollView
                  style={{ maxHeight: 140, marginTop: spacing.xs }}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                >
                  {recentDestinations.map((row) => (
                    <Pressable
                      key={row.id}
                      onPress={() => applyDestSuggestion(row)}
                      style={({ pressed }) => ({
                        paddingVertical: 10,
                        paddingHorizontal: 8,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderColor: colors.border,
                        opacity: pressed ? 0.85 : 1,
                      })}
                    >
                      <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 2, textAlign: rtl ? "right" : "left" }}>
                        {t("recentSearches")}
                      </Text>
                      <Text
                        style={{ color: colors.text, fontSize: 13, textAlign: rtl ? "right" : "left" }}
                        numberOfLines={3}
                      >
                        {row.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}
              <Pressable
                onPress={() => pickup && setMapEditTarget("destination")}
                disabled={!pickup}
                style={[
                  styles.destFakeInput,
                  {
                    backgroundColor: W.sheet,
                    borderColor: W.border,
                    flexDirection: rtl ? "row-reverse" : "row",
                    marginTop: spacing.sm,
                    marginBottom: 0,
                    opacity: pickup ? 1 : 0.5,
                  },
                ]}
              >
                <MaterialCommunityIcons name="gesture-tap" size={20} color={W.muted} style={{ marginHorizontal: 4 }} />
                <Text
                  style={{
                    color: destination ? W.text : W.muted,
                    flex: 1,
                    textAlign: rtl ? "right" : "left",
                    fontSize: 14,
                  }}
                  numberOfLines={2}
                >
                  {destination ? t("destinationSetShort") : t("destinationMapTapHint")}
                </Text>
              </Pressable>
              <Text style={{ color: W.muted, fontSize: 11, marginTop: spacing.sm, textAlign: rtl ? "right" : "left" }}>
                {!pickup
                  ? t("destinationLockedUntilPickup")
                  : mapEditTarget === "destination"
                    ? t("mapTapAppliesToDestination")
                    : t("tapDestinationCardForMap")}
              </Text>
            </View>

            {routeDistanceKm != null ? (
              <Text
                style={{
                  color: W.text,
                  fontWeight: "700",
                  fontSize: 14,
                  marginTop: spacing.md,
                  marginBottom: spacing.xs,
                  textAlign: rtl ? "right" : "left",
                }}
              >
                {t("routeDistanceKm", { km: routeDistanceKm.toFixed(1) })}
              </Text>
            ) : (
              <Text
                style={{
                  color: W.muted,
                  fontSize: 12,
                  marginTop: spacing.md,
                  marginBottom: spacing.xs,
                  textAlign: rtl ? "right" : "left",
                }}
              >
                {t("fareNeedsPickupAndDestination")}
              </Text>
            )}

            {pickup && destination && selectedVehicleType === "shipping" ? (
              <View
                style={{
                  marginTop: spacing.sm,
                  padding: spacing.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radius.lg,
                  backgroundColor: colors.surface,
                }}
              >
                <Text style={{ color: colors.text, fontWeight: "800", marginBottom: spacing.sm, textAlign: rtl ? "right" : "left" }}>
                  {t("parcelDetailsTitle")}
                </Text>

                <Text style={{ color: colors.textMuted, marginBottom: spacing.xs, textAlign: rtl ? "right" : "left" }}>
                  {t("parcelDescriptionLabel")}
                </Text>
                <TextInput
                  value={parcelDescription}
                  onChangeText={setParcelDescription}
                  placeholder={t("parcelDescriptionPlaceholder")}
                  placeholderTextColor={colors.textMuted}
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    color: colors.text,
                    backgroundColor: colors.surfaceMuted,
                    textAlign: rtl ? "right" : "left",
                  }}
                />

                <View style={{ flexDirection: rtl ? "row-reverse" : "row", gap: spacing.sm, marginTop: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.textMuted, marginBottom: spacing.xs, textAlign: rtl ? "right" : "left" }}>
                      {t("parcelReceiverNameLabel")}
                    </Text>
                    <TextInput
                      value={parcelReceiverName}
                      onChangeText={setParcelReceiverName}
                      placeholder={t("parcelReceiverNamePlaceholder")}
                      placeholderTextColor={colors.textMuted}
                      style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: radius.md,
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        color: colors.text,
                        backgroundColor: colors.surfaceMuted,
                        textAlign: rtl ? "right" : "left",
                      }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.textMuted, marginBottom: spacing.xs, textAlign: rtl ? "right" : "left" }}>
                      {t("parcelReceiverPhoneLabel")}
                    </Text>
                    <TextInput
                      value={parcelReceiverPhone}
                      onChangeText={setParcelReceiverPhone}
                      keyboardType="phone-pad"
                      placeholder={t("parcelReceiverPhonePlaceholder")}
                      placeholderTextColor={colors.textMuted}
                      style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: radius.md,
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        color: colors.text,
                        backgroundColor: colors.surfaceMuted,
                        textAlign: rtl ? "right" : "left",
                      }}
                    />
                  </View>
                </View>

                <Text style={{ color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.xs, textAlign: rtl ? "right" : "left" }}>
                  {t("parcelNotesLabel")}
                </Text>
                <TextInput
                  value={parcelNotes}
                  onChangeText={setParcelNotes}
                  placeholder={t("parcelNotesPlaceholder")}
                  placeholderTextColor={colors.textMuted}
                  multiline
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    minHeight: 80,
                    color: colors.text,
                    backgroundColor: colors.surfaceMuted,
                    textAlign: rtl ? "right" : "left",
                  }}
                />
              </View>
            ) : null}

            {pickup && destination && selectedVehicleType !== "shipping" ? (
              <PassengerSeatBookingBlock
                passengerCount={passengerCount}
                onPassengerCount={setPassengerCount}
                passengerSize={passengerSize}
                onPassengerSize={setPassengerSize}
                vehicleCapacity={selectedCapacity}
              />
            ) : null}

            <Text style={{ color: W.muted, fontSize: 12, marginBottom: spacing.sm, textAlign: rtl ? "right" : "left" }}>
              {t("tapMapShortLinked")}
            </Text>

            <Text style={{ color: W.muted, marginBottom: spacing.xs, fontSize: 13, textAlign: rtl ? "right" : "left" }}>
              {t("driversNearbyCount", { count: nearbyDrivers.length })}
            </Text>
            <Text style={{ color: W.muted, fontSize: 12, marginBottom: spacing.md, textAlign: rtl ? "right" : "left" }}>
              {t("pullToRefreshDrivers")}
            </Text>

            <View
              style={[
                styles.infoBar,
                {
                  backgroundColor: W.ink,
                  flexDirection: rtl ? "row-reverse" : "row",
                },
              ]}
            >
              <MaterialCommunityIcons name="information" size={20} color={W.onPrimary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoBarText, { color: W.onPrimary, textAlign: rtl ? "right" : "left" }]}>
                  {pickup && destination && routeDistanceKm != null
                    ? t("estimatedTripPriceWithKm", {
                        amount: priceInfoAmount,
                        km: routeDistanceKm.toFixed(1),
                        vehicle: t(`vehicleType_${selectedVehicleDoc?.nameKey || selectedVehicleDoc?.typeKey || "delivery"}`),
                      })
                    : pickup && destination
                      ? t("estimatedTripPrice", { amount: priceInfoAmount })
                      : t("priceStartsFrom", { amount: priceInfoAmount })}
                </Text>
                {pickup && destination && routeDistanceKm != null ? (
                  <Text
                    style={{
                      color: W.onPrimary,
                      opacity: 0.85,
                      fontSize: 12,
                      marginTop: 4,
                      textAlign: rtl ? "right" : "left",
                    }}
                  >
                    {t("fareDependsOnRouteAndVehicle")}
                  </Text>
                ) : null}
              </View>
            </View>

            {pickup && destination && suggestedAmountNum > 0 ? (
              <View style={{ marginTop: spacing.md }}>
                <Text style={{ color: W.text, fontWeight: "800", marginBottom: spacing.xs, textAlign: rtl ? "right" : "left" }}>
                  {t("passengerMinFareSectionTitle")}
                </Text>
                <Text style={{ color: W.muted, fontSize: 12, marginBottom: spacing.sm, textAlign: rtl ? "right" : "left" }}>
                  {t("passengerMinFareSectionHint", { suggested: suggestedAmountNum.toFixed(0) })}
                </Text>
                <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: spacing.sm }}>
                  <Pressable
                    onPress={() => adjustPassengerOffer(-5)}
                    style={[styles.offerAdjBtn, { borderColor: W.border, backgroundColor: W.field }]}
                  >
                    <Text style={{ color: W.text, fontWeight: "800" }}>−5</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => adjustPassengerOffer(-1)}
                    style={[styles.offerAdjBtn, { borderColor: W.border, backgroundColor: W.field }]}
                  >
                    <Text style={{ color: W.text, fontWeight: "800" }}>−1</Text>
                  </Pressable>
                  <TextInput
                    value={String(passengerMinOffer)}
                    onChangeText={(txt) => {
                      const n = parseFloat(txt.replace(",", "."));
                      if (Number.isNaN(n)) return;
                      setPassengerMinOffer(Math.max(suggestedAmountNum, Math.round(n * 100) / 100));
                    }}
                    keyboardType="decimal-pad"
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: W.border,
                      borderRadius: 14,
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      color: W.text,
                      fontWeight: "800",
                      textAlign: "center",
                      backgroundColor: W.sheet,
                    }}
                  />
                  <Pressable
                    onPress={() => adjustPassengerOffer(1)}
                    style={[styles.offerAdjBtn, { borderColor: W.border, backgroundColor: W.field }]}
                  >
                    <Text style={{ color: W.text, fontWeight: "800" }}>+1</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => adjustPassengerOffer(5)}
                    style={[styles.offerAdjBtn, { borderColor: W.border, backgroundColor: W.field }]}
                  >
                    <Text style={{ color: W.text, fontWeight: "800" }}>+5</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </>
        ) : null}

        {!locationAllowed ? (
          <Text style={{ color: colors.danger, marginBottom: spacing.sm, fontSize: 13 }}>{t("locationPermission")}</Text>
        ) : null}

        {needsRating ? (
          <Text style={{ color: colors.textMuted, marginBottom: spacing.sm, textAlign: rtl ? "right" : "left" }}>
            {t("rateToContinue")}
          </Text>
        ) : null}
        {!activeRide ? (
          <View style={{ marginTop: spacing.md }}>
            {creating ? (
              <View style={{ alignItems: "center", marginBottom: spacing.md }}>
                <CarMascot mode="searching" size={88} />
                <Text
                  style={{
                    marginTop: spacing.sm,
                    color: colors.textMuted,
                    fontSize: 13,
                    textAlign: "center",
                  }}
                >
                  {t("ridePhaseWaitingDriver")}
                </Text>
              </View>
            ) : null}
            <CustomButton
              title={t("searchDriverCta")}
              variant="ink"
              onPress={requestRide}
              disabled={creating || mapLocked || !canRequestRide}
              loading={creating}
            />
            {!canRequestRide && !creating ? (
              <Text style={{ color: W.muted, fontSize: 12, marginTop: spacing.sm, textAlign: rtl ? "right" : "left" }}>
                {!pickup ? t("requestRideHintPickup") : !destination ? t("requestRideHintDestination") : null}
              </Text>
            ) : null}
          </View>
        ) : null}

        {error ? (
          <Text style={{ color: colors.danger, marginTop: spacing.sm, textAlign: rtl ? "right" : "left" }}>{error}</Text>
        ) : null}

        {activeRide ? (
          <View style={{ marginTop: spacing.md }}>
            <Text style={{ color: colors.text, fontWeight: "700", marginBottom: spacing.xs, textAlign: rtl ? "right" : "left" }}>
              {t("trackRide")}
            </Text>
            <RideCard ride={activeRide} compact emphasis={rideStatus === "pending"} />
            {["pending", "accepted", "ongoing", "completed"].includes(rideStatus) ? (
              <View style={{ marginTop: spacing.sm }}>
                <CustomButton
                  title={t("openRideChat")}
                  variant="outline"
                  onPress={() => navigation.navigate("RideChat", { rideId: activeRide._id })}
                />
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <RateDriverModal visible={!!needsRating} ride={activeRide} />
      <SuccessFlash visible={bookingSuccessVisible} title={t("rideRequestSentTitle")} showHappyMascot />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  mapShell: { flex: 1, position: "relative" },
  mapLinkBanner: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    zIndex: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 0,
  },
  mapLinkBannerText: { flex: 1, fontSize: 13, fontWeight: "700" },
  map: { flex: 1 },
  gpsFab: {
    position: "absolute",
    bottom: 12,
    end: 12,
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    elevation: 4,
    shadowColor: W.shadow,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  sheetTitle: { fontSize: 18, fontWeight: "800", marginBottom: 6, letterSpacing: -0.3 },
  pickupRow: { alignItems: "center", gap: 10, marginBottom: 8 },
  dotPickup: { width: 10, height: 10, borderRadius: 5 },
  destFakeInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 4,
  },
  infoBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    marginBottom: 4,
  },
  infoBarText: { fontSize: 14, fontWeight: "600" },
  routeCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 4,
  },
  routeCardHeader: { alignItems: "flex-start", gap: 10 },
  routeActionBtn: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 2,
  },
  routeConnector: {
    alignItems: "center",
    marginVertical: 6,
    paddingHorizontal: 4,
  },
  routeConnectorLine: { flex: 1, height: 1, maxHeight: 1 },
  panel: {
    shadowColor: W.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  offerAdjBtn: {
    minWidth: 44,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
