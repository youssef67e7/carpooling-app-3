import { interpolateRoute } from "./geo.js";

function decodeGooglePolyline(encoded) {
  const points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

/**
 * Returns routePath [{lat,lng},...] using Google Directions when key set.
 * Throws in production if no API key is configured.
 */
export async function buildRoutePath(pickup, destination) {
  const key = process.env.GOOGLE_DIRECTIONS_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("GOOGLE_DIRECTIONS_API_KEY is not configured — cannot generate routes in production");
    }
    return interpolateRoute(pickup, destination, 28);
  }
  const origin = `${pickup.lat},${pickup.lng}`;
  const dest = `${destination.lat},${destination.lng}`;
  const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
  url.searchParams.set("origin", origin);
  url.searchParams.set("destination", dest);
  url.searchParams.set("key", key);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Directions API returned ${res.status}`);
  }
  const data = await res.json();
  const enc = data?.routes?.[0]?.overview_polyline?.points;
  if (!enc) {
    throw new Error("Directions API returned no route");
  }
  try {
    return decodeGooglePolyline(enc);
  } catch (e) {
    throw new Error(`Failed to decode polyline: ${e}`);
  }
}
