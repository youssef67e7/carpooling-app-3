import { createModel } from "../mongo/odm.js";

export const Message = createModel("messages", {
  modelName: "Message",
  refFields: {
    rideId: "Ride",
    senderId: "User",
  },
});
