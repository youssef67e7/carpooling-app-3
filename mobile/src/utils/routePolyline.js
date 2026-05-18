/**
 * Straight-line interpolation for map polylines (matches backend mock routes).
 * @param {{ latitude: number, longitude: number }} from
 * @param {{ latitude: number, longitude: number }} to
 * @param {number} [steps=24]
 * @returns {{ latitude: number, longitude: number }[]}
 */
export function interpolateMapCoords(from, to, steps = 24) {
  if (
    !from ||
    !to ||
    from.latitude == null ||
    from.longitude == null ||
    to.latitude == null ||
    to.longitude == null
  ) {
    return [];
  }
  const a = Number(from.latitude);
  const b = Number(from.longitude);
  const c = Number(to.latitude);
  const d = Number(to.longitude);
  if ([a, b, c, d].some((n) => Number.isNaN(n))) return [];
  const out = [];
  const n = Math.max(4, Math.min(48, Math.floor(steps)));
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    out.push({
      latitude: a + (c - a) * t,
      longitude: b + (d - b) * t,
    });
  }
  return out;
}
