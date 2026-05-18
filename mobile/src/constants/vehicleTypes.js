/** Stable keys — must match backend Vehicle.typeKey and auth validation */
export const DRIVER_VEHICLE_TYPES = [
  "shipping",
  "delivery",
  "travel",
  "motorcycle",
  "car_standard",
  "car_comfort",
];

/** All driver types except motorcycle (shown after «سيارة») */
export const DRIVER_VEHICLE_CAR_TYPES = DRIVER_VEHICLE_TYPES.filter(
  (k) => k !== "motorcycle"
);
