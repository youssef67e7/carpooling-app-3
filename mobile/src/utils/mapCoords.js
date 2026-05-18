/** Convert API routePath [{lat,lng}] to react-native-maps coordinates */
export function routePathToCoords(routePath) {
  if (!routePath || !routePath.length) return [];
  return routePath.map((p) => ({
    latitude: Number(p.lat),
    longitude: Number(p.lng),
  }));
}
