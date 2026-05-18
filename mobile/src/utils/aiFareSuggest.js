import { api } from "../api/client";

/**
 * Ask backend AI (optional) for fare suggestions.
 * Returns { suggested, min, max } using safe fallback on errors.
 */
export async function aiSuggestFare({ distanceKm, vehicleType, lang, passengerCount }) {
  try {
    const { data } = await api.post("/ai/fare/suggest", {
      distanceKm,
      vehicleType,
      lang,
      passengerCount,
    });
    return {
      suggested: Number(data?.suggested ?? 0) || 0,
      min: Number(data?.min ?? 0) || 0,
      max: Number(data?.max ?? 0) || 0,
      usedAI: !!data?.usedAI,
    };
  } catch {
    return { suggested: 0, min: 0, max: 0, usedAI: false };
  }
}

