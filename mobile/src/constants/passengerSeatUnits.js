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
      return 1;
  }
}

export function roundSeatUnits(u) {
  return Math.round(Number(u) * 10) / 10;
}

export function computeSeatUnits(passengerCount, passengerSize) {
  const n = Math.min(20, Math.max(1, Math.floor(Number(passengerCount) || 1)));
  const m = seatMultiplier(passengerSize);
  return roundSeatUnits(n * m);
}

export const SIZE_ICONS = {
  SMALL: "baby-face-outline",
  MEDIUM: "human-male",
  LARGE: "human-male-height",
  XL: "account-group",
};
