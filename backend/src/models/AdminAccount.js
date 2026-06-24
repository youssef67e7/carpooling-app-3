import { createModel } from "../mongo/odm.js";

export const AdminAccount = createModel("adminAccounts", {
  modelName: "AdminAccount",
  uniqueFields: ["email"],
});
