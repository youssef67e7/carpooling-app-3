/** Haversine distance in kilometers */
export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Simple fare: base + per km (tuned for demo currency units) */
export function estimateFareKm(distanceKm) {
  const base = 8;
  const perKm = 2.4;
  return Math.round((base + distanceKm * perKm) * 100) / 100;
}

/** fare = baseFare + (distanceKm * pricePerKm), rounded to 2 decimals */
export function fareFromVehiclePricing(baseFare, pricePerKm, distanceKm) {
  const b = Number(baseFare) || 0;
  const p = Number(pricePerKm) || 0;
  const d = Number(distanceKm) || 0;
  return Math.round((b + d * p) * 100) / 100;
}

/** Straight-line mock route as many lat/lng points for map polyline */
export function interpolateRoute(pickup, destination, steps = 24) {
  const out = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    out.push({
      lat: pickup.lat + (destination.lat - pickup.lat) * t,
      lng: pickup.lng + (destination.lng - pickup.lng) * t,
    });
  }
  return out;
}
