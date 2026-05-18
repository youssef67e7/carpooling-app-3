/**
 * “Ride in style” card images per service `typeKey`.
 * Uses bundled Weret assets (sedan / SUV / sport / van + top-down + editorial hero).
 */

const ASSETS = {
  classic: require("../../assets/weret/weret-gallery-classic.jpg"),
  suv: require("../../assets/weret/weret-gallery-suv.jpg"),
  sport: require("../../assets/weret/weret-gallery-sport.jpg"),
  van: require("../../assets/weret/weret-gallery-van.jpg"),
  /** Aerial sedan — reads well for standard / economy */
  topdown: require("../../assets/weret/weret-hero-topdown.jpg"),
  /** Wide editorial — premium / long-distance feel */
  editorial: require("../../assets/weret/weret-welcome-hero.jpg"),
};

/** Exact keys from app + API; extend when new types are added */
const BY_TYPE_KEY = {
  shipping: ASSETS.van,
  delivery: ASSETS.van,
  travel: ASSETS.editorial,
  motorcycle: ASSETS.sport,
  car_standard: ASSETS.classic,
  car_comfort: ASSETS.sport,
  economy: ASSETS.topdown,
  xl: ASSETS.suv,
  premium: ASSETS.editorial,
};

export function isMotorcycleServiceType(typeKey) {
  return String(typeKey || "").toLowerCase() === "motorcycle";
}

export function getWeretGalleryImageForTypeKey(typeKey) {
  const k = String(typeKey || "").toLowerCase().trim();
  if (BY_TYPE_KEY[k]) return BY_TYPE_KEY[k];

  if (k.includes("ship") || k.includes("parcel") || k.includes("cargo") || k.includes("freight")) return ASSETS.van;
  if (k.includes("deliver") || k.includes("courier")) return ASSETS.van;
  if (k.includes("xl") || k.includes("suv") || k.includes("minivan") || k.includes("people")) return ASSETS.suv;
  if (k.includes("moto") || k.includes("bike") || k.includes("scooter")) return ASSETS.sport;
  if (k.includes("premium") || k.includes("luxury") || k.includes("exec") || k.includes("travel")) return ASSETS.editorial;
  if (k.includes("comfort") || k.includes("sport") || k.includes("plus")) return ASSETS.sport;
  if (k.includes("economy") || k.includes("basic") || k.includes("standard")) return ASSETS.topdown;
  if (k.includes("van") || k.includes("shuttle")) return ASSETS.van;

  return ASSETS.classic;
}
