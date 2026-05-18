import { Platform } from "react-native";
import * as Location from "expo-location";
import { PermissionStatus } from "expo-location";

/**
 * Turn reverse-geocode fields into one line (native geocoder has no single "display_name").
 */
function formatAddress(addr) {
  if (!addr) return "";
  const parts = [addr.streetNumber, addr.street, addr.district, addr.city, addr.region, addr.country]
    .filter((x) => x != null && String(x).trim() !== "");
  return parts.length ? parts.join(", ") : "";
}

async function enrichLabelsFromReverseGeocode(query, locations, limit) {
  const sliced = locations.slice(0, limit);
  /** Only reverse a few results — platform geocoding is rate-limited */
  const reverseCap = 3;
  const out = [];
  for (let i = 0; i < sliced.length; i++) {
    const loc = sliced[i];
    let label = query.trim();
    if (i < reverseCap) {
      try {
        const rev = await Location.reverseGeocodeAsync({
          latitude: loc.latitude,
          longitude: loc.longitude,
        });
        const line = formatAddress(rev?.[0]);
        if (line) label = line;
      } catch {
        /* keep query + coords hint */
      }
    } else {
      label = `${query.trim()} · ${Number(loc.latitude).toFixed(4)}, ${Number(loc.longitude).toFixed(4)}`;
    }
    out.push({
      id: `geo-${i}-${String(loc.latitude)}-${String(loc.longitude)}`,
      label,
      latitude: loc.latitude,
      longitude: loc.longitude,
    });
  }
  return out;
}

/**
 * Nominatim — used on web (Expo web has no geocodeAsync) and as fallback on native when needed.
 * Errors are swallowed; returns [] on failure.
 * @see https://operations.osmfoundation.org/policies/nominatim/
 */
async function searchPlacesNominatim(query, opts = {}) {
  const q = String(query || "").trim();
  const limit = Math.min(10, Math.max(1, Number(opts.limit) || 6));
  const langRaw = String(opts.lang || "en");
  const lang = langRaw.split("-")[0] || "en";
  if (q.length < 2) return [];

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=${limit}&q=${encodeURIComponent(
    q
  )}&accept-language=${encodeURIComponent(lang)}`;

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        // RN may ignore User-Agent; still set for stacks that forward it
        "User-Agent": "ReachNativeCar/1.0 (passenger-app; nominatim)",
      },
    });

    const text = await res.text();
    if (!res.ok) return [];

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return [];
    }
    if (!Array.isArray(data)) return [];

    return data
      .map((item, i) => {
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
        return {
          id: item.place_id != null ? String(item.place_id) : `nominatim-${i}-${lat}-${lon}`,
          label: typeof item.display_name === "string" ? item.display_name : "",
          latitude: lat,
          longitude: lon,
        };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * On iOS/Android: platform geocoder (reliable, no external Nominatim limits from the device API).
 * On web: Nominatim only (Expo web throws on geocodeAsync).
 *
 * @param {string} query
 * @param {{ limit?: number, lang?: string }} [opts]
 * @returns {Promise<{ id: string, label: string, latitude: number, longitude: number }[]>}
 */
export async function searchPlaces(query, opts = {}) {
  const limit = Math.min(10, Math.max(1, Number(opts.limit) || 6));
  const q = String(query || "").trim();
  if (q.length < 2) return [];

  if (Platform.OS === "web") {
    return searchPlacesNominatim(q, opts);
  }

  try {
    const perm = await Location.getForegroundPermissionsAsync();
    if (perm.status !== PermissionStatus.GRANTED) {
      const req = await Location.requestForegroundPermissionsAsync();
      if (req.status !== PermissionStatus.GRANTED) {
        return searchPlacesNominatim(q, opts);
      }
    }

    const coords = await Location.geocodeAsync(q);
    if (!Array.isArray(coords) || coords.length === 0) {
      return searchPlacesNominatim(q, opts);
    }

    return enrichLabelsFromReverseGeocode(q, coords, limit);
  } catch {
    return searchPlacesNominatim(q, opts);
  }
}
