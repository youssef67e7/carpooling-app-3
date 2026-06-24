/** Shared vehicle type keys — must match backend Vehicle.typeKey */
export const DRIVER_VEHICLE_TYPES = [
  "shipping",
  "delivery",
  "travel",
  "motorcycle",
  "car_standard",
  "car_comfort",
];

export const DRIVER_VEHICLE_CAR_TYPES = DRIVER_VEHICLE_TYPES.filter((k) => k !== "motorcycle");
