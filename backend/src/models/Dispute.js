import { createModel } from "../mongo/odm.js";

export const Dispute = createModel("disputes", {
  modelName: "Dispute",
  refFields: {
    rideId: "Ride",
    initiatorId: "User",
    respondentId: "User",
    assignedAdminId: "User",
  },
});
