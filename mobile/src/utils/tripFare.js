/** Haversine distance in km — same formula as backend */
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

/** fare = baseFare + (distanceKm * pricePerKm) */
export function fareFromVehicle(baseFare, pricePerKm, distanceKm) {
  const b = Number(baseFare) || 0;
  const p = Number(pricePerKm) || 0;
  const d = Number(distanceKm) || 0;
  return Math.round((b + d * p) * 100) / 100;
}
