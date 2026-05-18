import { io } from "socket.io-client";
import { apiBaseURL } from "../api/client";
import { store } from "../store";
import { upsertRide, upsertAvailableRides } from "../store/slices/rideSlice";

let socket = null;
let currentToken = null;

function apiWsUrl() {
  // Reuse the exact same base URL as Axios to avoid LAN/localhost mismatches.
  return String(apiBaseURL || "").trim() || "http://localhost:3000";
}

function insertOrUpdateRide(list, ride) {
  const arr = Array.isArray(list) ? [...list] : [];
  const id = ride?._id;
  if (!id) return arr;
  const idx = arr.findIndex((r) => r?._id === id);
  if (idx >= 0) arr[idx] = ride;
  else arr.unshift(ride);
  return arr;
}

function isOfferExpired(ride) {
  const exp = ride?.driverProposal?.expiresAt ? new Date(ride.driverProposal.expiresAt) : null;
  if (!exp) return false;
  return exp.getTime() <= Date.now();
}

function shouldIncludeInDriverAvailable(me, ride) {
  if (!me?._id || (me?.active_role || me?.role) !== "driver") return false;
  if (!ride?._id) return false;
  if (ride.status !== "pending") return false;
  if (ride.driverId) return false;
  const myId = String(me._id);
  const pre =
    ride.preassignedDriverId?._id != null
      ? String(ride.preassignedDriverId._id)
      : ride.preassignedDriverId != null
        ? String(ride.preassignedDriverId)
        : null;
  if (ride.awaitingDriverConfirm && pre && pre !== myId) return false;
  const propId =
    ride.driverProposal?.driverId?._id != null
      ? String(ride.driverProposal.driverId._id)
      : ride.driverProposal?.driverId != null
        ? String(ride.driverProposal.driverId)
        : null;
  // If offer expired, treat as if no proposal exists (ride becomes available again).
  if (propId && propId !== myId && !isOfferExpired(ride)) return false;
  return true;
}

export function connectSocket(token) {
  const t = String(token || "").trim();
  if (!t) return null;
  if (socket && currentToken === t) return socket;

  disconnectSocket();
  currentToken = t;

  socket = io(apiWsUrl(), {
    // Allow polling fallback (some networks block websockets).
    transports: ["websocket", "polling"],
    auth: { token: `Bearer ${t}` },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 500,
    timeout: 8000,
  });

  socket.on("ride:update", (payload) => {
    const ride = payload?.ride;
    if (!ride?._id) return;
    store.dispatch(upsertRide(ride));

    const st = store.getState();
    const me = st.auth?.user;
    // Driver feed: keep available list updated without forcing a full refetch.
    if ((me?.active_role || me?.role) === "driver") {
      const cur = Array.isArray(st.ride?.availableRides) ? st.ride.availableRides : [];
      const should = shouldIncludeInDriverAvailable(me, ride);
      const exists = cur.some((r) => r?._id === ride._id);
      if (should) {
        const next = insertOrUpdateRide(cur, ride);
        store.dispatch(upsertAvailableRides(next));
      } else if (exists) {
        const next = cur.filter((r) => r?._id !== ride._id);
        store.dispatch(upsertAvailableRides(next));
      }
    }
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }
  socket = null;
  currentToken = null;
}

export function subscribeRide(rideId) {
  if (!socket || !rideId) return;
  socket.emit("subscribeRide", String(rideId));
}

export function unsubscribeRide(rideId) {
  if (!socket || !rideId) return;
  socket.emit("unsubscribeRide", String(rideId));
}

export function onRideMessage(handler) {
  if (!socket) return () => {};
  const h = (payload) => handler?.(payload);
  socket.on("ride:message", h);
  return () => socket.off("ride:message", h);
}

export function emitRideTyping(rideId, isTyping) {
  if (!socket || !rideId) return;
  socket.emit("ride:typing", { rideId: String(rideId), isTyping: Boolean(isTyping) });
}

export function onRideTyping(handler) {
  if (!socket) return () => {};
  const h = (payload) => handler?.(payload);
  socket.on("ride:typing", h);
  return () => socket.off("ride:typing", h);
}

export function subscribeDriverFeed(vehicleType) {
  if (!socket) return;
  socket.emit("subscribeDriverFeed", String(vehicleType || "delivery"));
}

export function unsubscribeDriverFeed(vehicleType) {
  if (!socket) return;
  socket.emit("unsubscribeDriverFeed", String(vehicleType || "delivery"));
}

// --- In-app call signaling (WebRTC over Socket.IO) ---
export function joinWebrtcRoom(rideId) {
  if (!socket || !rideId) return;
  socket.emit("webrtc:join", { rideId: String(rideId) });
}

export function leaveWebrtcRoom(rideId) {
  if (!socket || !rideId) return;
  socket.emit("webrtc:leave", { rideId: String(rideId) });
}

export function sendWebrtcSignal(rideId, data) {
  if (!socket || !rideId || !data) return;
  socket.emit("webrtc:signal", { rideId: String(rideId), data });
}

export function onWebrtcSignal(handler) {
  if (!socket) return () => {};
  const h = (payload) => handler?.(payload);
  socket.on("webrtc:signal", h);
  return () => socket.off("webrtc:signal", h);
}

export function isSocketConnected() {
  return !!socket?.connected;
}

