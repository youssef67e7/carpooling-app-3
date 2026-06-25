import { createModel } from "../mongo/odm.js";

export const FcmToken = createModel("fcmTokens", {
  modelName: "FcmToken",
  uniqueFields: ["token"],
  refFields: { userId: "User" },
});
