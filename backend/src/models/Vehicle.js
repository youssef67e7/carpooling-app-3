import { createModel } from "../mongo/odm.js";

/** Stable keys (e.g. shipping | delivery | travel | motorcycle) — Ride.vehicleType & User.vehicleType */
export const Vehicle = createModel("vehicles", {
  modelName: "Vehicle",
  uniqueFields: ["typeKey"],
});
