import { createModel } from "../mongo/odm.js";

export const Ride = createModel("rides", {
  modelName: "Ride",
  refFields: {
    passengerId: "User",
    driverId: "User",
    preassignedDriverId: "User",
    "driverProposal.driverId": "User",
  },
});
