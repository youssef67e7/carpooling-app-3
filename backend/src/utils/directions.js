import { interpolateRoute } from "./geo.js";

const ORS_BASE = "https://api.openrouteservice.org/v2/directions/driving-car";

function logWarn(...args) {
  if (process.env.NODE_ENV !== "test") {
    console.warn("[directions]", ...args);
  }
}

function geojsonToLatLng(coordinates) {
  return coordinates.map(([lng, lat]) => ({ lat, lng }));
}

function haversineKmApprox(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const aVal = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return R * 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
}

function fallbackRoutePath(pickup, destination, reason) {
  logWarn(`Fallback to straight-line interpolation: ${reason}`);
  return interpolateRoute(pickup, destination, 28);
}

/**
 * Returns routePath [{lat,lng},...] using OpenRouteService when API key is set.
 * Falls back to straight-line interpolation if key is missing or any error occurs.
 */
export async function buildRoutePath(pickup, destination) {
  const key = process.env.OPENROUTESERVICE_API_KEY;
  if (!key) {
    return fallbackRoutePath(pickup, destination, "OPENROUTESERVICE_API_KEY not set");
  }

  try {
    const body = {
      coordinates: [
        [pickup.lng, pickup.lat],
        [destination.lng, destination.lat],
      ],
    };

    const res = await fetch(ORS_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: key,
        Accept: "application/json, application/geo+json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const hint = res.status === 401 ? "Invalid API key" : res.status === 429 ? "Rate limited" : `HTTP ${res.status}`;
      return fallbackRoutePath(pickup, destination, `OpenRouteService returned ${hint}`);
    }

    const data = await res.json();
    const coords = data?.features?.[0]?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) {
      return fallbackRoutePath(pickup, destination, "OpenRouteService returned no route geometry");
    }

    return geojsonToLatLng(coords);
  } catch (err) {
    return fallbackRoutePath(pickup, destination, `OpenRouteService error: ${err.message}`);
  }
}
