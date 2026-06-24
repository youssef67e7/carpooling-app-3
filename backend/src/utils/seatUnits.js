/** Align with mobile/src/constants/passengerSeatUnits.js */

export const PASSENGER_SIZES = ["SMALL", "MEDIUM", "LARGE", "XL"];

export function seatMultiplier(size) {
  const s = String(size || "").toUpperCase();
  switch (s) {
    case "SMALL":
      return 1;
    case "MEDIUM":
      return 1;
    case "LARGE":
      return 1.5;
    case "XL":
      return 2;
    default:
      throw new Error(`Invalid passenger size: ${size}`);
  }
}

/** Round to 0.1 to avoid float drift */
export function roundSeatUnits(u) {
  return Math.round(Number(u) * 10) / 10;
}

/**
 * @param {number} passengerCount people in this booking (same size tier)
 * @param {string} passengerSize SMALL|MEDIUM|LARGE|XL
 */
export function computeSeatUnits(passengerCount, passengerSize) {
  const n = Math.min(20, Math.max(1, Math.floor(Number(passengerCount) || 1)));
  const m = seatMultiplier(passengerSize);
  return roundSeatUnits(n * m);
}
