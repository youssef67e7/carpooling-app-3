import { createModel } from "../mongo/odm.js";

export const DriverDocuments = createModel("driverDocuments", {
  modelName: "DriverDocuments",
  uniqueFields: ["userId"],
  refFields: { userId: "User" },
});
