const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

function normLang(raw) {
  const s = String(raw || "").trim();
  if (!s) return "en";
  return s.split("-")[0];
}

/**
 * Mapbox Geocoding API (autocomplete).
 * Returns: { id, label, latitude, longitude }[]
 */
export async function mapboxAutocomplete(query, opts = {}) {
  const q = String(query || "").trim();
  if (q.length < 2) return [];

  if (!MAPBOX_TOKEN) {
    throw new Error("Missing EXPO_PUBLIC_MAPBOX_TOKEN");
  }

  const limit = Math.min(10, Math.max(1, Number(opts.limit) || 6));
  const lang = normLang(opts.lang);
  const proximity =
    opts.proximity && opts.proximity.longitude != null && opts.proximity.latitude != null
      ? `${Number(opts.proximity.longitude)},${Number(opts.proximity.latitude)}`
      : null;

  const params = new URLSearchParams({
    access_token: MAPBOX_TOKEN,
    autocomplete: "true",
    limit: String(limit),
    language: lang,
    types: "address,place,poi",
  });
  if (proximity) params.set("proximity", proximity);

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?${params.toString()}`;
  const res = await fetch(url);
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.message || data?.error || String(res.status);
    throw new Error(msg);
  }
  const features = Array.isArray(data?.features) ? data.features : [];
  return features
    .map((f) => {
      const center = Array.isArray(f.center) ? f.center : null;
      const lon = center?.[0];
      const lat = center?.[1];
      if (lat == null || lon == null) return null;
      return {
        id: f.id || `${lat},${lon}`,
        label: f.place_name || f.text || "",
        latitude: Number(lat),
        longitude: Number(lon),
      };
    })
    .filter(Boolean);
}

