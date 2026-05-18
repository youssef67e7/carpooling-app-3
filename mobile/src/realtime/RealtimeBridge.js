import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import {
  connectSocket,
  disconnectSocket,
  subscribeDriverFeed,
  subscribeRide,
  unsubscribeDriverFeed,
  unsubscribeRide,
} from "./socket";

export default function RealtimeBridge() {
  const token = useSelector((s) => s.auth.token);
  const user = useSelector((s) => s.auth.user);
  const activeRideId = useSelector((s) => s.ride.activeRide?._id);

  const prevRideRef = useRef(null);
  const prevFeedRef = useRef(null);

  useEffect(() => {
    if (!token) {
      disconnectSocket();
      return undefined;
    }
    connectSocket(token);
    return () => {
      // keep connection across navigation; only disconnect on token removal/unmount
    };
  }, [token]);

  useEffect(() => {
    const prev = prevRideRef.current;
    if (prev && prev !== activeRideId) unsubscribeRide(prev);
    if (activeRideId) subscribeRide(activeRideId);
    prevRideRef.current = activeRideId || null;
  }, [activeRideId]);

  useEffect(() => {
    const vt = (user?.active_role || user?.role) === "driver" ? user?.vehicleType || "delivery" : null;
    const prev = prevFeedRef.current;
    if (prev && prev !== vt) unsubscribeDriverFeed(prev);
    if (vt) subscribeDriverFeed(vt);
    prevFeedRef.current = vt;
  }, [user?.active_role, user?.role, user?.vehicleType]);

  return null;
}

