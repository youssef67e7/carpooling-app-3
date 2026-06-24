import { createModel } from "../mongo/odm.js";

export const PassengerProfile = createModel("passengerProfiles", {
  modelName: "PassengerProfile",
  uniqueFields: ["userId"],
  refFields: { userId: "User" },
});
