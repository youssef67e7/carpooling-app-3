/**
 * Map provider: no Google Maps API — avoids keys and billing; MapView uses the default
 * tiles for your build (e.g. OSM / platform defaults in Expo). Backend/API linking is unchanged.
 */
export function getAndroidMapProvider() {
  return undefined;
}

/** MapView + RTL: flex shell only (`direction` caused issues on some RN/Hermes combos). */
export const mapLtrContainerStyle = { flex: 1 };
