import { createModel } from "../mongo/odm.js";

export const Report = createModel("reports", {
  modelName: "Report",
  refFields: {
    reporterId: "User",
    reportedUserId: "User",
    rideId: "Ride",
  },
});
