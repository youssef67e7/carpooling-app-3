import { createModel } from "../mongo/odm.js";

export const NotificationPref = createModel("notificationPrefs", {
  modelName: "NotificationPref",
  refFields: {
    userId: { model: "User", required: true, index: true },
  },
  uniqueFields: ["userId"],
});
