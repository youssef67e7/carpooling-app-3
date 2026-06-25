import { createModel } from "../mongo/odm.js";

export const Notification = createModel("notifications", {
  modelName: "Notification",
  refFields: { userId: "User" },
});
