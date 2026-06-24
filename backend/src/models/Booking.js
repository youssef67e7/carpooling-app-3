import { createModel } from "../mongo/odm.js";

export const Booking = createModel("bookings", {
  modelName: "Booking",
  refFields: {
    rideId: "Ride",
    passengerId: "User",
  },
});
